-- update-passwords-correct.sql
-- Update Harriet Mburu (Admin)
UPDATE users SET password = 'Hattyjohninvestments1@2026' WHERE username = 'Harriet Mburu';

-- Update Uniform Department
UPDATE users SET password = '1437stella' WHERE username = 'Stella.Uni' AND department = 'Uniform';
UPDATE users SET password = 'IRENEM' WHERE username = 'Irene.Uni' AND department = 'Uniform';
UPDATE users SET password = 'NkuNja' WHERE username = 'Margaret.Uni' AND department = 'Uniform';

-- Update Stationery Department
UPDATE users SET password = '1437stella' WHERE username = 'Stella.Stat' AND department = 'Stationery';
UPDATE users SET password = 'IRENEM' WHERE username = 'Irene.Stat' AND department = 'Stationery';
UPDATE users SET password = 'NkuNja' WHERE username = 'Margaret.Stat' AND department = 'Stationery';