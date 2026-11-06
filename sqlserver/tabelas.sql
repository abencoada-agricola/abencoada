USE [app_abencoada];
GO
SELECT s.name AS [Esquema],t.name AS [Tabela],SUM(p.rows) AS [Registros]
FROM sys.tables t
JOIN sys.schemas s ON s.schema_id=t.schema_id
JOIN sys.partitions p ON p.object_id=t.object_id AND p.index_id IN (0,1)
GROUP BY s.name,t.name ORDER BY s.name,t.name;
GO
