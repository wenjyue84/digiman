import { callAPI } from '../lib/http-client.js';
import { MCPTool, MCPToolResult } from '../types/mcp.js';

export const analyticsTools: MCPTool[] = [
  {
    name: 'pelangi_unit_utilization',
    description: 'Get unit utilization statistics and trends',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'pelangi_guest_statistics',
    description: 'Get guest statistics (nationality breakdown, average stay, etc.)',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'pelangi_export_guests_csv',
    description: 'Export guest data in CSV format',
    inputSchema: {
      type: 'object',
      properties: {
        checkedIn: { type: 'boolean', description: 'Include only checked-in guests (default: false)' }
      }
    }
  }
];

export async function unitUtilization(args: any): Promise<MCPToolResult> {
  try {
    const [occupancy, units] = await Promise.all([
      callAPI('GET', '/api/occupancy'),
      callAPI('GET', '/api/units')
    ]);

    const unitsArray = units as any[];
    const needsCleaning = unitsArray.filter(c => c.needsCleaning).length;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          total: (occupancy as any).total,
          occupied: (occupancy as any).occupied,
          available: (occupancy as any).available,
          needsCleaning,
          utilizationRate: (occupancy as any).occupancyRate,
          unitsNeedingCleaning: unitsArray.filter(c => c.needsCleaning).map(c => c.number)
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error getting utilization: ${error.message}`
      }],
      isError: true
    };
  }
}

export async function guestStatistics(args: any): Promise<MCPToolResult> {
  try {
    const [checkedIn, history] = await Promise.all([
      callAPI('GET', '/api/guests/checked-in?page=1&limit=10000'),
      callAPI('GET', '/api/guests/history?page=1&limit=10000')
    ]);

    const currentGuests = (checkedIn as any).data || [];
    const allGuests = (history as any).data || [];

    // Nationality breakdown
    const nationalityCount: Record<string, number> = {};
    allGuests.forEach((g: any) => {
      if (g.nationality) {
        nationalityCount[g.nationality] = (nationalityCount[g.nationality] || 0) + 1;
      }
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          currentGuests: currentGuests.length,
          totalGuestsAllTime: allGuests.length,
          nationalityBreakdown: nationalityCount,
          topNationalities: Object.entries(nationalityCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([nationality, count]) => ({ nationality, count }))
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error getting guest statistics: ${error.message}`
      }],
      isError: true
    };
  }
}

export async function exportGuestsCSV(args: any): Promise<MCPToolResult> {
  try {
    const checkedInOnly = args.checkedIn || false;

    let guests;
    if (checkedInOnly) {
      const response = await callAPI('GET', '/api/guests/checked-in?page=1&limit=10000');
      guests = (response as any).data || [];
    } else {
      const response = await callAPI('GET', '/api/guests/history?page=1&limit=10000');
      guests = (response as any).data || [];
    }

    // Generate CSV
    const headers = ['Name', 'ID Number', 'Nationality', 'Phone', 'Email', 'Unit', 'Check-in', 'Expected Checkout', 'Payment Amount', 'Payment Method'];
    const rows = guests.map((g: any) => [
      g.name || '',
      g.idNumber || '',
      g.nationality || '',
      g.phoneNumber || '',
      g.email || '',
      g.unitNumber || '',
      g.checkinTime || '',
      g.expectedCheckoutDate || '',
      g.paymentAmount || '',
      g.paymentMethod || ''
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

    return {
      content: [{
        type: 'text',
        text: csv
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error exporting CSV: ${error.message}`
      }],
      isError: true
    };
  }
}
