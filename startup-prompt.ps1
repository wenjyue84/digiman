# PelangiManager Startup Prompt - Clean Version
# Shows a modern dialog asking if servers should be started

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Create the form
$form = New-Object System.Windows.Forms.Form
$form.Text = 'PelangiManager Startup'
$form.Size = New-Object System.Drawing.Size(500,320)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.TopMost = $true
$form.BackColor = [System.Drawing.Color]::White

# Add icon
$form.Icon = [System.Drawing.SystemIcons]::Question

# Add title label
$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Location = New-Object System.Drawing.Point(20,15)
$titleLabel.Size = New-Object System.Drawing.Size(450,30)
$titleLabel.Text = "Start PelangiManager Development Servers?"
$titleLabel.Font = New-Object System.Drawing.Font("Segoe UI",14,[System.Drawing.FontStyle]::Bold)
$titleLabel.ForeColor = [System.Drawing.Color]::FromArgb(0,102,204)
$form.Controls.Add($titleLabel)

# Add separator line
$separator = New-Object System.Windows.Forms.Panel
$separator.Location = New-Object System.Drawing.Point(20,50)
$separator.Size = New-Object System.Drawing.Size(450,2)
$separator.BackColor = [System.Drawing.Color]::FromArgb(220,220,220)
$form.Controls.Add($separator)

# Add description label
$descLabel = New-Object System.Windows.Forms.Label
$descLabel.Location = New-Object System.Drawing.Point(20,65)
$descLabel.Size = New-Object System.Drawing.Size(450,25)
$descLabel.Text = "The following servers will be started:"
$descLabel.Font = New-Object System.Drawing.Font("Segoe UI",10)
$descLabel.ForeColor = [System.Drawing.Color]::FromArgb(60,60,60)
$form.Controls.Add($descLabel)

# Add server list (using simple dashes)
$server1 = New-Object System.Windows.Forms.Label
$server1.Location = New-Object System.Drawing.Point(40,100)
$server1.Size = New-Object System.Drawing.Size(430,25)
$server1.Text = "- Frontend (React + Vite)                                  Port 3000"
$server1.Font = New-Object System.Drawing.Font("Segoe UI",10)
$server1.ForeColor = [System.Drawing.Color]::FromArgb(40,40,40)
$form.Controls.Add($server1)

$server2 = New-Object System.Windows.Forms.Label
$server2.Location = New-Object System.Drawing.Point(40,130)
$server2.Size = New-Object System.Drawing.Size(430,25)
$server2.Text = "- Backend API (Express + PostgreSQL)               Port 5000"
$server2.Font = New-Object System.Drawing.Font("Segoe UI",10)
$server2.ForeColor = [System.Drawing.Color]::FromArgb(40,40,40)
$form.Controls.Add($server2)

$server3 = New-Object System.Windows.Forms.Label
$server3.Location = New-Object System.Drawing.Point(40,160)
$server3.Size = New-Object System.Drawing.Size(430,25)
$server3.Text = "- Rainbow AI + WhatsApp (MCP Server)            Port 3002"
$server3.Font = New-Object System.Drawing.Font("Segoe UI",10)
$server3.ForeColor = [System.Drawing.Color]::FromArgb(40,40,40)
$form.Controls.Add($server3)

# Add button panel for better alignment
$buttonPanel = New-Object System.Windows.Forms.Panel
$buttonPanel.Location = New-Object System.Drawing.Point(0,210)
$buttonPanel.Size = New-Object System.Drawing.Size(500,90)
$buttonPanel.BackColor = [System.Drawing.Color]::FromArgb(248,248,248)
$form.Controls.Add($buttonPanel)

# Add Yes button (Start Servers)
$yesButton = New-Object System.Windows.Forms.Button
$yesButton.Location = New-Object System.Drawing.Point(110,25)
$yesButton.Size = New-Object System.Drawing.Size(130,40)
$yesButton.Text = 'Start Servers'
$yesButton.DialogResult = [System.Windows.Forms.DialogResult]::Yes
$yesButton.Font = New-Object System.Drawing.Font("Segoe UI",11,[System.Drawing.FontStyle]::Bold)
$yesButton.BackColor = [System.Drawing.Color]::FromArgb(0,120,215)
$yesButton.ForeColor = [System.Drawing.Color]::White
$yesButton.FlatStyle = 'Flat'
$yesButton.FlatAppearance.BorderSize = 0
$yesButton.Cursor = [System.Windows.Forms.Cursors]::Hand
$buttonPanel.Controls.Add($yesButton)
$form.AcceptButton = $yesButton

# Add No button (Don't Start)
$noButton = New-Object System.Windows.Forms.Button
$noButton.Location = New-Object System.Drawing.Point(260,25)
$noButton.Size = New-Object System.Drawing.Size(130,40)
$noButton.Text = "Don't Start"
$noButton.DialogResult = [System.Windows.Forms.DialogResult]::No
$noButton.Font = New-Object System.Drawing.Font("Segoe UI",11)
$noButton.BackColor = [System.Drawing.Color]::FromArgb(240,240,240)
$noButton.ForeColor = [System.Drawing.Color]::FromArgb(60,60,60)
$noButton.FlatStyle = 'Flat'
$noButton.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(200,200,200)
$noButton.Cursor = [System.Windows.Forms.Cursors]::Hand
$buttonPanel.Controls.Add($noButton)
$form.CancelButton = $noButton

# Show the dialog and get result
$result = $form.ShowDialog()

if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
    # User clicked Yes - start servers
    Write-Host "Starting PelangiManager servers..." -ForegroundColor Green

    # Change to project directory
    Set-Location "C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur"

    # Start frontend + backend in one window
    Start-Process cmd -ArgumentList '/k', 'npm run dev:clean' -WindowStyle Normal

    # Wait a bit for main servers to start
    Start-Sleep -Seconds 3

    # Start MCP server in separate window
    Start-Process cmd -ArgumentList '/c', 'cd /d C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server && npm run dev' -WindowStyle Normal

    Write-Host "Servers started!" -ForegroundColor Green
} else {
    # User clicked No or closed dialog
    Write-Host "Startup cancelled by user." -ForegroundColor Yellow
}

# Exit the PowerShell window
exit
