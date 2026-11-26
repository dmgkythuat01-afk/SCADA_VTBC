$ErrorActionPreference = 'Stop'
& "$env:WINDIR\Microsoft.NET\Framework\v4.0.30319\csc.exe" /nologo /r:System.Data.dll /r:System.Data.DataSetExtensions.dll /r:System.Core.dll /out:tests\MaterialSaveTests.exe tests\MaterialSaveTests.cs CanScadaVienTreoBC\Services\NguyenLieuCanSave.cs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& .\tests\MaterialSaveTests.exe
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& .\tests\CompileCheck.ps1
