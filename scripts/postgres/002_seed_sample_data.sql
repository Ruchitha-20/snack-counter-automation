-- Sample data for Oslo and Bengaluru.
-- Run after 001_create_tables.sql. Safe to re-run by using stable unique keys.

BEGIN;

INSERT INTO snack_counter.office (name, currency_code, monthly_budget)
VALUES
    ('Oslo', 'NOK', 6000.00),
    ('Bengaluru', 'INR', 15000.00)
ON CONFLICT (name) DO UPDATE
SET currency_code = EXCLUDED.currency_code,
    monthly_budget = EXCLUDED.monthly_budget;

INSERT INTO snack_counter.employee (employee_code, full_name)
VALUES
    ('OSL-101', 'Erik'),
    ('OSL-102', 'Nora'),
    ('OSL-103', 'Jonas'),
    ('BLR-201', 'Ananya'),
    ('BLR-202', 'Ravi'),
    ('BLR-203', 'Meera')
ON CONFLICT (employee_code) DO UPDATE
SET full_name = EXCLUDED.full_name,
    is_active = TRUE;

-- Set the home office for each sample employee.
INSERT INTO snack_counter.employee_office_membership
    (employee_id, office_id, membership_type, valid_from)
SELECT e.id, o.id, 'HOME', CURRENT_DATE
FROM (VALUES
    ('OSL-101', 'Oslo'),
    ('OSL-102', 'Oslo'),
    ('OSL-103', 'Oslo'),
    ('BLR-201', 'Bengaluru'),
    ('BLR-202', 'Bengaluru'),
    ('BLR-203', 'Bengaluru')
) AS seed(employee_code, office_name)
JOIN snack_counter.employee e ON e.employee_code = seed.employee_code
JOIN snack_counter.office o ON o.name = seed.office_name
ON CONFLICT (employee_id, office_id) DO NOTHING;

INSERT INTO snack_counter.volunteer_availability (employee_id, office_id, is_available)
SELECT e.id, o.id, TRUE
FROM (VALUES
    ('OSL-101', 'Oslo'),
    ('OSL-102', 'Oslo'),
    ('OSL-103', 'Oslo'),
    ('BLR-201', 'Bengaluru'),
    ('BLR-202', 'Bengaluru'),
    ('BLR-203', 'Bengaluru')
) AS seed(employee_code, office_name)
JOIN snack_counter.employee e ON e.employee_code = seed.employee_code
JOIN snack_counter.office o ON o.name = seed.office_name
ON CONFLICT (employee_id, office_id) DO UPDATE
SET is_available = TRUE,
    updated_at = NOW();

INSERT INTO snack_counter.snack_box (office_id, name, location_note)
SELECT o.id, seed.box_name, seed.location_note
FROM (VALUES
    ('Oslo', 'Kitchen snack box', 'Main kitchen'),
    ('Bengaluru', 'Main pantry snack box', 'Main pantry')
) AS seed(office_name, box_name, location_note)
JOIN snack_counter.office o ON o.name = seed.office_name
ON CONFLICT (office_id, name) DO UPDATE
SET location_note = EXCLUDED.location_note,
    is_active = TRUE;

-- Create the current month's budget rows from the office defaults.
INSERT INTO snack_counter.office_monthly_budget
    (office_id, budget_month, currency_code, budget_amount)
SELECT id,
       DATE_TRUNC('month', CURRENT_DATE)::DATE,
       currency_code,
       monthly_budget
FROM snack_counter.office
ON CONFLICT (office_id, budget_month) DO UPDATE
SET currency_code = EXCLUDED.currency_code,
    budget_amount = EXCLUDED.budget_amount,
    updated_at = NOW();

COMMIT;
