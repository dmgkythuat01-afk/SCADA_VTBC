$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition 'public class CompilerBootstrap {}'
$root = (Resolve-Path 'CanScadaVienTreoBC').Path
[xml]$project = Get-Content "$root\CanScadaVienTreoBC.csproj"
$framework = 'C:\Program Files (x86)\Reference Assemblies\Microsoft\Framework\.NETFramework\v4.6.1'
$refPaths = [System.Collections.Generic.HashSet[string]]::new()
Get-ChildItem "$framework\*.dll","$framework\Facades\*.dll" | ForEach-Object { [void]$refPaths.Add($_.FullName) }
foreach ($r in $project.Project.ItemGroup.Reference) {
 if ($r.HintPath) { [void]$refPaths.Add([IO.Path]::GetFullPath([IO.Path]::Combine($root,[string]$r.HintPath))) }
}
[void]$refPaths.Add("$root\obj\Debug\Interop.ActUtlTypeLib.dll")
[void]$refPaths.Add("$root\bin\Debug\netstandard.dll")
$refs = [System.Collections.Generic.List[Microsoft.CodeAnalysis.MetadataReference]]::new()
foreach ($p in $refPaths | Where-Object { $_ -notmatch "System.EnterpriseServices.(Wrapper|Thunk).dll$" }) { $refs.Add([Microsoft.CodeAnalysis.MetadataReference]::CreateFromFile($p)) }
$trees = [System.Collections.Generic.List[Microsoft.CodeAnalysis.SyntaxTree]]::new()
foreach ($c in $project.Project.ItemGroup.Compile | Where-Object { $_.Include }) {
 $p = [IO.Path]::Combine($root,[string]$c.Include)
 $trees.Add([Microsoft.CodeAnalysis.CSharp.CSharpSyntaxTree]::ParseText([IO.File]::ReadAllText($p),$null,$p))
}
$options = [Microsoft.CodeAnalysis.CSharp.CSharpCompilationOptions]::new([Microsoft.CodeAnalysis.OutputKind]::DynamicallyLinkedLibrary)
$compilation = [Microsoft.CodeAnalysis.CSharp.CSharpCompilation]::Create('CanScadaCompileCheck',$trees,$refs,$options)
$output = [IO.MemoryStream]::new()
$result = $compilation.Emit($output)
$result.Diagnostics | Where-Object Severity -eq 'Error' | ForEach-Object ToString
if (!$result.Success) { exit 1 }
'PASS: all project C# sources compile against .NET Framework 4.6.1 references (resources/COM packaging not built)'

