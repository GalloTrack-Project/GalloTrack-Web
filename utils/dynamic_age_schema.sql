-- ==============================================================================
-- GALLOTRACK: DYNAMIC AGE & CALENDAR TRACKING SCHEMA (MySQL 8.0+)
-- ==============================================================================

-- 1. Gamefowl Table Schema with Hatch Date
CREATE TABLE IF NOT EXISTS `gamefowls` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tag_number` VARCHAR(50) NOT NULL UNIQUE,
    `name` VARCHAR(100) NOT NULL,
    `gender` ENUM('Rooster', 'Hen') NOT NULL DEFAULT 'Rooster',
    `hatch_date` DATE NOT NULL,
    `breed` VARCHAR(100) DEFAULT 'Foundation Stock',
    `sire_id` INT NULL,
    `dam_id` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_hatch_date` (`hatch_date`),
    INDEX `idx_gender` (`gender`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Dynamic View: Computed Age & Growth Classification
CREATE OR REPLACE VIEW `vw_gamefowl_dynamic_age` AS
SELECT 
    id,
    tag_number,
    name,
    gender,
    hatch_date,
    breed,
    -- Compute exact age in full months
    TIMESTAMPDIFF(MONTH, hatch_date, CURDATE()) AS age_in_months,
    -- Compute exact total days since hatch
    DATEDIFF(CURDATE(), hatch_date) AS age_in_days,
    -- Compute remaining days after full months
    DATEDIFF(
        CURDATE(), 
        DATE_ADD(hatch_date, INTERVAL TIMESTAMPDIFF(MONTH, hatch_date, CURDATE()) MONTH)
    ) AS remaining_days,
    -- Dynamic Growth Stage Classification based on age & gender
    CASE 
        WHEN TIMESTAMPDIFF(MONTH, hatch_date, CURDATE()) < 6 THEN 'Chick'
        WHEN TIMESTAMPDIFF(MONTH, hatch_date, CURDATE()) BETWEEN 6 AND 11 THEN 
            CASE WHEN gender = 'Hen' THEN 'Pullet' ELSE 'Stag' END
        WHEN TIMESTAMPDIFF(MONTH, hatch_date, CURDATE()) BETWEEN 12 AND 24 THEN 
            CASE WHEN gender = 'Hen' THEN 'Hen' ELSE 'Bull Stag' END
        ELSE 
            CASE WHEN gender = 'Hen' THEN 'Hen' ELSE 'Cock' END
    END AS computed_growth_stage,
    -- Next Monthly Birthday / Milestone Date
    DATE_ADD(hatch_date, INTERVAL (TIMESTAMPDIFF(MONTH, hatch_date, CURDATE()) + 1) MONTH) AS next_monthly_milestone,
    -- Adult Maturity Date (12 Months)
    DATE_ADD(hatch_date, INTERVAL 12 MONTH) AS adult_maturity_date
FROM `gamefowls`;

-- 3. Dynamic Milestone Calendar View
CREATE OR REPLACE VIEW `vw_upcoming_milestones` AS
SELECT 
    id AS gamefowl_id,
    tag_number,
    name,
    gender,
    hatch_date,
    '6-Month Growth Stage Transition' AS milestone_type,
    DATE_ADD(hatch_date, INTERVAL 6 MONTH) AS milestone_date,
    CASE WHEN gender = 'Hen' THEN 'Pullet' ELSE 'Stag' END AS target_stage
FROM `gamefowls`
WHERE DATE_ADD(hatch_date, INTERVAL 6 MONTH) >= CURDATE()

UNION ALL

SELECT 
    id AS gamefowl_id,
    tag_number,
    name,
    gender,
    hatch_date,
    '12-Month Adult Maturity Transition' AS milestone_type,
    DATE_ADD(hatch_date, INTERVAL 12 MONTH) AS milestone_date,
    CASE WHEN gender = 'Hen' THEN 'Hen' ELSE 'Bull Stag' END AS target_stage
FROM `gamefowls`
WHERE DATE_ADD(hatch_date, INTERVAL 12 MONTH) >= CURDATE()

ORDER BY milestone_date ASC;
