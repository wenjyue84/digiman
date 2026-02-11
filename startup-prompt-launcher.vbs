' Silent launcher for PelangiManager startup prompt
' This VBScript runs the PowerShell script without showing a console window

Set objShell = CreateObject("WScript.Shell")
scriptPath = "C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\startup-prompt.ps1"

' Run PowerShell script silently
objShell.Run "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & scriptPath & """", 0, False
