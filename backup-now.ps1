$stamp = Get-Date -Format "yyyy-MM-dd-HHmm"
Copy-Item data\db.json "data\backups\manual-$stamp.json"
Write-Host "Manual backup created: manual-$stamp.json" -ForegroundColor Green
Get-ChildItem data\backups\ | Sort-Object LastWriteTime -Descending | Select-Object -First 5 Name, Length, LastWriteTime
