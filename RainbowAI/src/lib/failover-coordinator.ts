/**
 * FailoverCoordinator — Primary/Standby heartbeat-based coordination
 *
 * Both the local PC (primary) and Lightsail (standby) servers link to the same
 * WhatsApp number via Baileys multi-device. Both receive ALL incoming messages.
 * This coordinator ensures only ONE server is "active" (sends responses) at a time.
 *
 * Primary:  sends heartbeat POST to standby every heartbeatIntervalMs
 *           (skipped if no peerUrl — e.g. standby is behind NAT)
 * Standby:  TWO modes depending on reachability:
 *   Push mode (default):  receives heartbeats from primary, activates if none for failoverThresholdMs
 *   Pull mode (NAT):      polls primary's status endpoint when standby has peerUrl but primary can't push
 *                          activates if primary is unreachable for failoverThresholdMs
 */

import { EventEmitter } from 'events';

// ─── Types ──────────────────────────────────────────────────────────

export interface FailoverSettings {
  enabled: boolean;
  heartbeatIntervalMs: number;
  failoverThresholdMs: number;
  handbackMode: 'immediate' | 'grace';
  handbackGracePeriodMs: number;
}

export interface FailoverStatus {
  role: 'primary' | 'standby';
  isActive: boolean;
  enabled: boolean;
  forcedStandby: boolean;
  lastHeartbeatReceivedAt: number | null;
  lastHeartbeatSentAt: number | null;
  missedBeats: number;
  peerUrl: string | null;
  secondsSinceLastBeat: number | null;
}

export interface InitOptions {
  role: 'primary' | 'standby';
  peerUrl?: string;
  secret: string;
  settings: FailoverSettings;
}

// ─── FailoverCoordinator ─────────────────────────────────────────────

class FailoverCoordinator extends EventEmitter {
  role: 'primary' | 'standby' = 'primary';
  isActiveFlag: boolean = true;
  lastHeartbeatReceivedAt: number | null = null;
  lastHeartbeatSentAt: number | null = null;
  heartbeatTimer: NodeJS.Timeout | null = null;
  monitorTimer: NodeJS.Timeout | null = null;
  missedBeats: number = 0;
  peerUrl: string | null = null;
  secret: string = '';
  settings: FailoverSettings = {
    enabled: true,
    heartbeatIntervalMs: 20000,
    failoverThresholdMs: 60000,
    handbackMode: 'immediate',
    handbackGracePeriodMs: 30000,
  };
  private handbackTimer: NodeJS.Timeout | null = null;
  private initialized: boolean = false;
  private _forcedStandby: boolean = false;

  // ─── Init ────────────────────────────────────────────────────────

  init(opts: InitOptions): void {
    if (this.initialized) this._clearTimers();

    this.role = opts.role;
    this.peerUrl = opts.peerUrl ?? null;
    this.secret = opts.secret;
    if (opts.settings) this.settings = { ...this.settings, ...opts.settings };
    this.initialized = true;

    if (!this.settings.enabled) {
      // Failover disabled — always active, no timers
      this.isActiveFlag = true;
      console.log('[Failover] Disabled — always active');
      return;
    }

    if (this.role === 'primary') {
      this.isActiveFlag = true;
      this.startHeartbeatSender();
      console.log('[Failover] Role: primary — Active: true');
    } else {
      this.isActiveFlag = false;
      this.lastHeartbeatReceivedAt = Date.now(); // Assume healthy at boot
      this.startHeartbeatMonitor();
      console.log('[Failover] Role: standby — Active: false');
    }
  }

  // ─── Primary: heartbeat sender ───────────────────────────────────

  private startHeartbeatSender(): void {
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), this.settings.heartbeatIntervalMs);
  }

  private async sendHeartbeat(): Promise<void> {
    if (!this.peerUrl) return;

    const url = `${this.peerUrl}/api/rainbow/whatsapp/heartbeat`;
    const body = JSON.stringify({ timestamp: Date.now(), role: 'primary' });

    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.secret}`,
        },
        body,
        signal: AbortSignal.timeout(5000),
      });
      this.lastHeartbeatSentAt = Date.now();
    } catch (err: any) {
      // Fire-and-forget: log but never throw
      console.warn(`[Failover] Heartbeat to ${url} failed: ${err.message}`);
    }
  }

  // ─── Standby: heartbeat monitor ──────────────────────────────────

  private startHeartbeatMonitor(): void {
    const pollInterval = Math.floor(this.settings.heartbeatIntervalMs / 2);
    // If standby has a peerUrl, use pull mode (poll primary health)
    // Otherwise, use push mode (wait for heartbeats from primary)
    if (this.peerUrl) {
      console.log('[Failover] Standby using PULL mode — polling primary at', this.peerUrl);
      this.monitorTimer = setInterval(() => this.pollPrimaryHealth(), pollInterval);
    } else {
      this.monitorTimer = setInterval(() => this.checkHeartbeat(), pollInterval);
    }
  }

  private checkHeartbeat(): void {
    if (this.lastHeartbeatReceivedAt === null) return;
    const elapsed = Date.now() - this.lastHeartbeatReceivedAt;
    if (elapsed > this.settings.failoverThresholdMs && !this.isActiveFlag) {
      const beatsMissed = Math.floor(elapsed / this.settings.heartbeatIntervalMs);
      this.missedBeats = beatsMissed;
      this.activate();
    }
  }

  /**
   * Pull mode: standby actively polls primary's /health endpoint to detect failures.
   * Used when standby is behind NAT and can't receive pushed heartbeats.
   * Uses the unauthenticated /health endpoint (no admin key needed).
   */
  private async pollPrimaryHealth(): Promise<void> {
    if (!this.peerUrl) return;
    const url = `${this.peerUrl}/health`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        // Primary is alive — treat as heartbeat received
        this.lastHeartbeatReceivedAt = Date.now();
        this.missedBeats = 0;
        if (this.isActiveFlag) {
          console.log('[Failover] Primary reachable via poll — handing back');
          this.deactivate();
        }
      } else {
        this._handlePollFailure();
      }
    } catch {
      this._handlePollFailure();
    }
  }

  private _handlePollFailure(): void {
    if (this.lastHeartbeatReceivedAt === null) return;
    const elapsed = Date.now() - this.lastHeartbeatReceivedAt;
    if (elapsed > this.settings.failoverThresholdMs && !this.isActiveFlag) {
      this.missedBeats = Math.floor(elapsed / this.settings.heartbeatIntervalMs);
      this.activate();
    }
  }

  // ─── Standby: receive heartbeat from primary ─────────────────────

  receiveHeartbeat(): void {
    this.lastHeartbeatReceivedAt = Date.now();
    this.missedBeats = 0;

    if (this.role === 'primary') {
      // Misconfiguration: two primaries
      console.warn('[Failover] WARNING: Received heartbeat but I am also primary — check config!');
      this.emit('config-error', 'Both servers set to primary role');
      return;
    }

    if (this.isActiveFlag) {
      // Primary is back — hand back
      console.log('[Failover] Primary heartbeat resumed — handing back');
      this.deactivate();
    }
  }

  // ─── Activate / Deactivate ───────────────────────────────────────

  activate(): void {
    if (this.isActiveFlag) return;
    this.isActiveFlag = true;
    console.warn('[Failover] ACTIVATED — primary appears down, this standby is now handling messages');
    this.emit('activated');
  }

  deactivate(): void {
    if (!this.isActiveFlag) return;

    if (this.settings.handbackMode === 'grace' && this.settings.handbackGracePeriodMs > 0) {
      if (this.handbackTimer) return; // already waiting
      console.log(`[Failover] Grace period started (${this.settings.handbackGracePeriodMs}ms) before handing back`);
      this.handbackTimer = setTimeout(() => {
        this.handbackTimer = null;
        this._doDeactivate();
      }, this.settings.handbackGracePeriodMs);
    } else {
      this._doDeactivate();
    }
  }

  private _doDeactivate(): void {
    this.isActiveFlag = false;
    console.log('[Failover] DEACTIVATED — primary resumed, suppressing replies');
    this.emit('deactivated');
  }

  // ─── Manual overrides ────────────────────────────────────────────

  promote(): void {
    console.log('[Failover] Manual PROMOTE — forcing active');
    this._forcedStandby = false;
    this.isActiveFlag = true;
    this.emit('promoted');
  }

  demote(): void {
    console.log('[Failover] Manual DEMOTE — forcing inactive');
    this.isActiveFlag = false;
    if (this.handbackTimer) { clearTimeout(this.handbackTimer); this.handbackTimer = null; }
    this.emit('demoted');
  }

  /**
   * Force this server into standby mode:
   * - Stops sending heartbeats (so Lightsail will activate after threshold)
   * - Suppresses replies locally
   */
  forceStandby(): void {
    console.log('[Failover] FORCE STANDBY — stopping heartbeats, Lightsail will take over');
    this._forcedStandby = true;
    this.isActiveFlag = false;
    this._clearTimers();
    this.emit('force-standby');
  }

  /**
   * Resume primary role:
   * - Restarts heartbeat sender (so Lightsail hands back)
   * - Resumes handling messages locally
   */
  resumePrimary(): void {
    console.log('[Failover] RESUME PRIMARY — restarting heartbeats, taking back control');
    this._forcedStandby = false;
    this.isActiveFlag = true;
    if (this.role === 'primary' && this.settings.enabled) {
      this.startHeartbeatSender();
    }
    this.emit('resume-primary');
  }

  isForcedStandby(): boolean {
    return this._forcedStandby;
  }

  // ─── Status ──────────────────────────────────────────────────────

  isActive(): boolean {
    if (!this.settings.enabled) return true;
    return this.isActiveFlag;
  }

  getStatus(): FailoverStatus {
    const now = Date.now();
    const secondsSinceLastBeat = this.lastHeartbeatReceivedAt !== null
      ? Math.floor((now - this.lastHeartbeatReceivedAt) / 1000)
      : null;
    return {
      role: this.role,
      isActive: this.isActive(),
      enabled: this.settings.enabled,
      forcedStandby: this._forcedStandby,
      lastHeartbeatReceivedAt: this.lastHeartbeatReceivedAt,
      lastHeartbeatSentAt: this.lastHeartbeatSentAt,
      missedBeats: this.missedBeats,
      peerUrl: this.peerUrl,
      secondsSinceLastBeat,
    };
  }

  // ─── Live settings update ────────────────────────────────────────

  updateSettings(newSettings: Partial<FailoverSettings>): void {
    this.settings = { ...this.settings, ...newSettings };

    if (!this.initialized) return;

    // Restart timers with new thresholds
    this._clearTimers();
    if (!this.settings.enabled) {
      this.isActiveFlag = true;
      return;
    }
    if (this.role === 'primary') {
      this.startHeartbeatSender();
    } else {
      this.startHeartbeatMonitor();
    }
    console.log('[Failover] Settings updated — timers restarted');
  }

  // ─── Helpers ─────────────────────────────────────────────────────

  private _clearTimers(): void {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
    if (this.monitorTimer) { clearInterval(this.monitorTimer); this.monitorTimer = null; }
    if (this.handbackTimer) { clearTimeout(this.handbackTimer); this.handbackTimer = null; }
  }
}

// ─── Singleton export ─────────────────────────────────────────────

export const failoverCoordinator = new FailoverCoordinator();
