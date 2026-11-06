param([string]$Database='app_abencoada',[string]$Server='localhost')
$ErrorActionPreference='Stop'
[Console]::InputEncoding=New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false)
$connection=New-Object System.Data.SqlClient.SqlConnection
$builder=New-Object System.Data.SqlClient.SqlConnectionStringBuilder
$builder['Data Source']=$Server
$builder['Initial Catalog']=$Database
$builder['Integrated Security']=$true
$builder['TrustServerCertificate']=$true
$connection.ConnectionString=$builder.ConnectionString
$connection.Open()
$transaction=$null
while ($null -ne ($line=[Console]::ReadLine())) {
 try {
  $request=$line | ConvertFrom-Json
  if ($request.action -eq 'begin') {$transaction=$connection.BeginTransaction([System.Data.IsolationLevel]::Serializable);$result=@{ok=$true}}
  elseif ($request.action -eq 'commit') {$transaction.Commit();$transaction=$null;$result=@{ok=$true}}
  elseif ($request.action -eq 'rollback') {if($transaction){$transaction.Rollback();$transaction=$null};$result=@{ok=$true}}
  else {
   $command=$connection.CreateCommand();$command.CommandTimeout=60
   $command.CommandText=$request.sql
   if($transaction){$command.Transaction=$transaction}
   foreach($property in $request.params.PSObject.Properties){
    $value=$property.Value
    $parameter=$command.Parameters.Add('@'+$property.Name,[System.Data.SqlDbType]::NVarChar,-1)
    if($null -eq $value){$parameter.Value=[DBNull]::Value}
    elseif($value -is [bool]){$parameter.SqlDbType=[System.Data.SqlDbType]::Bit;$parameter.Value=$value}
    elseif($value -is [long] -or $value -is [int]){$parameter.SqlDbType=[System.Data.SqlDbType]::BigInt;$parameter.Value=$value}
    elseif($value -is [double] -or $value -is [decimal]){$parameter.SqlDbType=[System.Data.SqlDbType]::Decimal;$parameter.Precision=28;$parameter.Scale=8;$parameter.Value=$value}
    else{$parameter.Value=[string]$value}
   }
   $reader=$command.ExecuteReader();$rows=New-Object System.Collections.Generic.List[object]
   do {while($reader.Read()){$row=[ordered]@{};for($i=0;$i -lt $reader.FieldCount;$i++){$value=$reader.GetValue($i);if($value -is [DBNull]){$value=$null}elseif($value -is [DateTimeOffset]){$value=$value.ToString('o')}elseif($value -is [DateTime]){$value=$value.ToString('yyyy-MM-ddTHH:mm:ss.fffffff')}elseif($value -is [Guid]){$value=$value.ToString()}elseif($value -is [byte[]]){$value='\x'+([BitConverter]::ToString($value).Replace('-','').ToLowerInvariant())};$row[$reader.GetName($i)]=$value};$rows.Add($row)}}while($reader.NextResult())
   $reader.Close();$command.Dispose();$result=@{rows=@($rows.ToArray())}
  }
  [Console]::WriteLine((ConvertTo-Json -InputObject $result -Depth 50 -Compress))
 }catch{[Console]::WriteLine((ConvertTo-Json -InputObject @{error=$_.Exception.Message} -Compress))}
}
if($transaction){$transaction.Rollback()};$connection.Dispose()
