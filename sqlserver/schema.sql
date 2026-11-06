-- Generated from all 22 ordered PostgreSQL migrations. No production data or fake seeds.
SET XACT_ABORT ON;
IF SCHEMA_ID('app') IS NULL EXEC('CREATE SCHEMA [app]');
IF SCHEMA_ID('private') IS NULL EXEC('CREATE SCHEMA [private]');
IF SCHEMA_ID('app_auth') IS NULL EXEC('CREATE SCHEMA [app_auth]');
CREATE TABLE [app_auth].[users]([id] uniqueidentifier PRIMARY KEY,[email] nvarchar(320) NOT NULL UNIQUE,[password_hash] nvarchar(300) NULL);
CREATE TABLE [app_auth].[sessions]([token_hash] nvarchar(64) PRIMARY KEY,[user_id] uniqueidentifier NOT NULL REFERENCES [app_auth].[users](id),[expires_at] datetimeoffset NOT NULL);
CREATE TABLE [private].[diesel_devices](
 [user_id] uniqueidentifier NOT NULL,
 [device_id] uniqueidentifier NOT NULL,
 [email] nvarchar(320) NOT NULL,
 [token_hash] varbinary(32) NOT NULL,
 [expires_at] datetimeoffset(7) NOT NULL,
 PRIMARY KEY ([user_id],[device_id]),
 UNIQUE ([token_hash])
);
CREATE TABLE [private].[diesel_occurrence_photos](
 [operation_id] uniqueidentifier NOT NULL,
 [data_url] nvarchar(max) NOT NULL,
 PRIMARY KEY ([operation_id])
);
CREATE TABLE [private].[login_attempts](
 [bucket] nvarchar(320) NOT NULL,
 [window_start] datetimeoffset(7) NOT NULL,
 [attempts] int NOT NULL,
 PRIMARY KEY ([bucket])
);
CREATE TABLE [private].[record_control_audit](
 [id] bigint IDENTITY(1,1) NOT NULL,
 [record_id] uniqueidentifier NOT NULL,
 [kind] nvarchar(max) NOT NULL,
 [action] nvarchar(max) NOT NULL,
 [reason] nvarchar(max) NULL,
 [actor_id] uniqueidentifier NOT NULL,
 [actor_name] nvarchar(max) NOT NULL,
 [created_at] datetimeoffset(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
 PRIMARY KEY ([id])
);
CREATE TABLE [private].[removed_members](
 [email] nvarchar(320) NOT NULL,
 [member_data] nvarchar(max) NOT NULL CHECK ([member_data] IS NULL OR ISJSON([member_data])=1),
 [removed_at] datetimeoffset(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
 [removed_by] uniqueidentifier NOT NULL,
 [removed_by_name] nvarchar(max) NOT NULL,
 PRIMARY KEY ([email])
);
CREATE TABLE [private].[user_access_audit](
 [id] bigint IDENTITY(1,1) NOT NULL,
 [email] nvarchar(320) NOT NULL,
 [previous_access] nvarchar(max) NULL CHECK ([previous_access] IS NULL OR ISJSON([previous_access])=1),
 [new_access] nvarchar(max) NOT NULL CHECK ([new_access] IS NULL OR ISJSON([new_access])=1),
 [actor_id] uniqueidentifier NOT NULL,
 [actor_name] nvarchar(max) NOT NULL,
 [created_at] datetimeoffset(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
 PRIMARY KEY ([id])
);
CREATE TABLE [app].[diesel_checklist_templates](
 [fleet] nvarchar(320) NOT NULL,
 [version] int NOT NULL,
 [questions] nvarchar(max) NOT NULL CHECK ([questions] IS NULL OR ISJSON([questions])=1),
 [created_at] datetimeoffset(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
 [created_by] uniqueidentifier NOT NULL,
 PRIMARY KEY ([fleet],[version])
);
CREATE TABLE [app].[diesel_checklists](
 [id] uniqueidentifier NOT NULL,
 [fleet] nvarchar(320) NOT NULL,
 [template_version] int NOT NULL,
 [user_id] uniqueidentifier NOT NULL,
 [operator] nvarchar(max) NOT NULL,
 [created_at] datetimeoffset(7) NOT NULL,
 [received_at] datetimeoffset(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
 [answers] nvarchar(max) NOT NULL CHECK ([answers] IS NULL OR ISJSON([answers])=1),
 [grade] nvarchar(max) NOT NULL,
 [resolutions] nvarchar(max) NOT NULL DEFAULT N'{}' CHECK ([resolutions] IS NULL OR ISJSON([resolutions])=1),
 PRIMARY KEY ([id])
);
CREATE TABLE [app].[diesel_locations](
 [local_code] nvarchar(320) NOT NULL,
 [material_code] nvarchar(320) NOT NULL,
 [name] nvarchar(max) NOT NULL DEFAULT N'',
 [material_name] nvarchar(max) NOT NULL DEFAULT N'',
 [last_meter] decimal(28,8) NULL,
 [updated_at] datetimeoffset(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
 [last_verified_meter] decimal(28,8) NULL,
 [is_test] bit NOT NULL DEFAULT 0,
 [simulated_meter] bit NOT NULL DEFAULT 0,
 PRIMARY KEY ([local_code],[material_code])
);
CREATE TABLE [app].[diesel_materials](
 [material_code] nvarchar(320) NOT NULL,
 [material_name] nvarchar(max) NOT NULL,
 PRIMARY KEY ([material_code])
);
CREATE TABLE [app].[diesel_operations](
 [id] uniqueidentifier NOT NULL,
 [user_id] uniqueidentifier NOT NULL,
 [operator] nvarchar(max) NOT NULL,
 [kind] nvarchar(max) NOT NULL,
 [local_code] nvarchar(320) NULL,
 [material_code] nvarchar(320) NULL,
 [destination] nvarchar(320) NULL,
 [notes] nvarchar(max) NULL,
 [created_at] datetimeoffset(7) NOT NULL,
 [received_at] datetimeoffset(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
 [recorder_start] decimal(28,8) NULL,
 [recorder_end] decimal(28,8) NULL,
 [recorder_liters] decimal(28,8) NULL,
 [has_photo] bit NOT NULL DEFAULT 0,
 [is_test] bit NOT NULL DEFAULT 0,
 [removed_at] datetimeoffset(7) NULL,
 [removed_by] uniqueidentifier NULL,
 [removed_by_name] nvarchar(max) NULL,
 [removal_reason] nvarchar(max) NULL,
 [fleet] nvarchar(320) NULL,
 PRIMARY KEY ([id])
);
CREATE TABLE [app].[fleets](
 [id] nvarchar(320) NOT NULL,
 [name] nvarchar(max) NOT NULL,
 [type] nvarchar(max) NOT NULL,
 [active] bit NOT NULL DEFAULT 1,
 [meter_fields] nvarchar(max) NOT NULL DEFAULT N'{"km": true, "engine": false, "elevator": false}' CHECK ([meter_fields] IS NULL OR ISJSON([meter_fields])=1),
 [gmais_readings] nvarchar(max) NULL CHECK ([gmais_readings] IS NULL OR ISJSON([gmais_readings])=1),
 [model] nvarchar(max) NOT NULL DEFAULT N'',
 [tank_capacity] decimal(28,8) NULL,
 [is_test] bit NOT NULL DEFAULT 0,
 [tank_reference] nvarchar(max) NULL CHECK ([tank_reference] IS NULL OR ISJSON([tank_reference])=1),
 PRIMARY KEY ([id])
);
CREATE TABLE [app].[members](
 [email] nvarchar(320) NOT NULL,
 [name] nvarchar(max) NOT NULL,
 [role] nvarchar(max) NOT NULL,
 [username] nvarchar(320) NOT NULL,
 [permissions] nvarchar(max) NOT NULL DEFAULT N'{"refuel": true, "transfer": true, "checklist": true}' CHECK ([permissions] IS NULL OR ISJSON([permissions])=1),
 PRIMARY KEY ([email]),
 UNIQUE ([username])
);
CREATE TABLE [app].[records](
 [id] uniqueidentifier NOT NULL,
 [fleet] nvarchar(320) NOT NULL,
 [date] date NOT NULL,
 [operator] nvarchar(max) NOT NULL,
 [user_id] uniqueidentifier NULL,
 [engine] decimal(28,8) NOT NULL,
 [elevator] decimal(28,8) NOT NULL,
 [km] decimal(28,8) NOT NULL,
 [start] decimal(28,8) NULL,
 [end] decimal(28,8) NULL,
 [liters] decimal(28,8) NOT NULL,
 [signature] nvarchar(max) NOT NULL,
 [notes] nvarchar(max) NOT NULL DEFAULT N'',
 [created_at] datetimeoffset(7) NOT NULL,
 [received_at] datetimeoffset(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
 [signature_source] nvarchar(max) NOT NULL DEFAULT N'account',
 [submission_key] uniqueidentifier NULL,
 [capture_mode] nvarchar(max) NOT NULL DEFAULT N'full',
 [measured_fields] nvarchar(max) NOT NULL DEFAULT N'{"km": true, "engine": true, "elevator": true}' CHECK ([measured_fields] IS NULL OR ISJSON([measured_fields])=1),
 [previous_readings] nvarchar(max) NULL CHECK ([previous_readings] IS NULL OR ISJSON([previous_readings])=1),
 [previous_record_id] uniqueidentifier NULL,
 [local_code] nvarchar(320) NULL,
 [material_code] nvarchar(320) NULL,
 [recorder_start] decimal(28,8) NULL,
 [recorder_end] decimal(28,8) NULL,
 [tank_capacity_at_record] decimal(28,8) NULL,
 [capacity_warning_confirmed] bit NOT NULL DEFAULT 0,
 [is_test] bit NOT NULL DEFAULT 0,
 [removed_at] datetimeoffset(7) NULL,
 [removed_by] uniqueidentifier NULL,
 [removed_by_name] nvarchar(max) NULL,
 [removal_reason] nvarchar(max) NULL,
 PRIMARY KEY ([id])
);
CREATE TABLE [app].[settings](
 [id] nvarchar(320) NOT NULL,
 [value] nvarchar(max) NOT NULL CHECK ([value] IS NULL OR ISJSON([value])=1),
 PRIMARY KEY ([id])
);
ALTER TABLE [private].[diesel_occurrence_photos] ADD CONSTRAINT [diesel_occurrence_photos_operation_id_fkey] FOREIGN KEY ([operation_id]) REFERENCES [app].[diesel_operations]([id]);
ALTER TABLE [app].[diesel_checklist_templates] ADD CONSTRAINT [diesel_checklist_templates_fleet_fkey] FOREIGN KEY ([fleet]) REFERENCES [app].[fleets]([id]);
ALTER TABLE [app].[diesel_checklists] ADD CONSTRAINT [diesel_checklists_fleet_template_version_fkey] FOREIGN KEY ([fleet],[template_version]) REFERENCES [app].[diesel_checklist_templates]([fleet],[version]);
ALTER TABLE [app].[diesel_operations] ADD CONSTRAINT [diesel_operations_fleet_fkey] FOREIGN KEY ([fleet]) REFERENCES [app].[fleets]([id]);
ALTER TABLE [app].[records] ADD CONSTRAINT [records_fleet_fkey] FOREIGN KEY ([fleet]) REFERENCES [app].[fleets]([id]);
ALTER TABLE [app].[records] ADD CONSTRAINT [records_previous_record_id_fkey] FOREIGN KEY ([previous_record_id]) REFERENCES [app].[records]([id]);
ALTER TABLE [app].[records] ADD CONSTRAINT [records_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [app_auth].[users]([id]);
ALTER TABLE [app].members ADD CHECK (role IN ('admin','operator')),CHECK (LEN(name) BETWEEN 2 AND 120),CHECK (LEN(username) BETWEEN 3 AND 30);
ALTER TABLE [app].records ADD CHECK (liters>0 AND liters<=1000000000),CHECK(engine BETWEEN 0 AND 1000000000),CHECK(elevator BETWEEN 0 AND 1000000000),CHECK(km BETWEEN 0 AND 1000000000),CHECK(capture_mode IN ('quick','full'));
ALTER TABLE [app].diesel_operations ADD CHECK(kind IN ('transfer','occurrence'));
ALTER TABLE [app].diesel_checklists ADD CHECK(grade IN ('PERFEITO','ATENCAO','CRITICO'));
CREATE INDEX records_fleet ON [app].records(fleet);
CREATE INDEX records_user ON [app].records(user_id);
CREATE INDEX records_received ON [app].records(received_at DESC);
CREATE INDEX checklist_received ON [app].diesel_checklists(fleet,received_at DESC);
INSERT INTO [app].settings(id,value) VALUES('rules',N'{"futureDate":false,"matchMeter":false}');
