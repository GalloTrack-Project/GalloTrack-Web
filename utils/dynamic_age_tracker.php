<?php
/**
 * GalloTrack - Dynamic Age & Calendar Synchronization Module
 * PHP 8.0+ / MySQL 8.0+ Compatible
 */

declare(strict_types=1);

namespace GalloTrack\Utils;

use DateTime;
use DateTimeImmutable;
use DateInterval;
use InvalidArgumentException;

class DynamicAgeTracker
{
    /**
     * Compute exact dynamic age metrics from a given hatch date relative to reference date.
     *
     * @param string|DateTimeInterface $hatchDate Date of hatching (YYYY-MM-DD or DateTime)
     * @param string|DateTimeInterface|null $referenceDate Reference date (defaults to today)
     * @return array{
     *     years: int,
     *     months: int,
     *     days: int,
     *     total_months: int,
     *     total_days: int,
     *     formatted: string
     * }
     */
    public static function computeAge($hatchDate, $referenceDate = null): array
    {
        $hatch = self::toDateTimeImmutable($hatchDate);
        $ref = $referenceDate !== null ? self::toDateTimeImmutable($referenceDate) : new DateTimeImmutable('today');

        if ($hatch > $ref) {
            throw new InvalidArgumentException("Hatch date cannot be in the future.");
        }

        $diff = $hatch->diff($ref);
        $totalMonths = ($diff->y * 12) + $diff->m;
        $totalDays = (int) $ref->diff($hatch)->format('%a');

        $formattedParts = [];
        if ($diff->y > 0) {
            $formattedParts[] = $diff->y . ' ' . ($diff->y === 1 ? 'yr' : 'yrs');
        }
        if ($diff->m > 0 || $diff->y === 0) {
            $formattedParts[] = $diff->m . ' ' . ($diff->m === 1 ? 'mo' : 'mos');
        }
        if ($diff->d > 0 && $diff->y === 0) {
            $formattedParts[] = $diff->d . ' ' . ($diff->d === 1 ? 'day' : 'days');
        }

        return [
            'years' => $diff->y,
            'months' => $diff->m,
            'days' => $diff->d,
            'total_months' => $totalMonths,
            'total_days' => $totalDays,
            'formatted' => implode(', ', $formattedParts)
        ];
    }

    /**
     * Dynamically classify growth stage based on total age in months and gender class.
     *
     * @param int $totalMonths Total computed age in months
     * @param string $gender 'Rooster' or 'Hen' (or 'Male'/'Female')
     * @return string Growth stage ('Chick', 'Stag', 'Pullet', 'Bull Stag', 'Cock', 'Hen')
     */
    public static function determineGrowthStage(int $totalMonths, string $gender = 'Rooster'): string
    {
        $isFemale = in_array(strtolower($gender), ['hen', 'pullet', 'female'], true);

        if ($totalMonths < 6) {
            return 'Chick';
        }

        if ($totalMonths >= 6 && $totalMonths <= 11) {
            return $isFemale ? 'Pullet' : 'Stag';
        }

        if ($totalMonths >= 12 && $totalMonths <= 24) {
            return $isFemale ? 'Hen' : 'Bull Stag';
        }

        return $isFemale ? 'Hen' : 'Cock';
    }

    /**
     * Generate dynamic calendar milestones for a given gamefowl.
     *
     * @param string|DateTimeInterface $hatchDate
     * @param string $gender
     * @return array<int, array{milestone: string, event_date: string, stage: string, days_remaining: int}>
     */
    public static function generateMilestoneCalendar($hatchDate, string $gender = 'Rooster'): array
    {
        $hatch = self::toDateTimeImmutable($hatchDate);
        $today = new DateTimeImmutable('today');

        $milestoneDefinitions = [
            ['months' => 6, 'name' => '6-Month Growth Transition', 'stage' => strtolower($gender) === 'hen' ? 'Pullet' : 'Stag'],
            ['months' => 12, 'name' => '12-Month Adult Maturity', 'stage' => strtolower($gender) === 'hen' ? 'Hen' : 'Bull Stag'],
            ['months' => 24, 'name' => '24-Month Prime Senior Cock/Hen', 'stage' => strtolower($gender) === 'hen' ? 'Hen' : 'Cock'],
        ];

        $calendar = [];
        foreach ($milestoneDefinitions as $def) {
            $eventDate = $hatch->add(new DateInterval('P' . $def['months'] . 'M'));
            $daysRemaining = (int) $today->diff($eventDate)->format('%r%a');

            $calendar[] = [
                'milestone' => $def['name'],
                'event_date' => $eventDate->format('Y-m-d'),
                'stage' => $def['stage'],
                'days_remaining' => $daysRemaining,
                'is_completed' => $daysRemaining <= 0
            ];
        }

        return $calendar;
    }

    /**
     * Helper to safely convert input to DateTimeImmutable.
     */
    private static function toDateTimeImmutable($date): DateTimeImmutable
    {
        if ($date instanceof DateTimeImmutable) {
            return $date;
        }

        if ($date instanceof DateTime) {
            return DateTimeImmutable::createFromMutable($date);
        }

        if (is_string($date)) {
            return new DateTimeImmutable($date);
        }

        throw new InvalidArgumentException("Invalid date format provided.");
    }
}
