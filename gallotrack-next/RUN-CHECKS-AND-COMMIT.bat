@echo off
setlocal
title GalloTrack - Checks and Commit
cd /d "%~dp0"

set "FILES=components/match/MatchLogsTable.tsx components/match/MatchLogsView.tsx components/match/MatchLogsRecordBadge.tsx components/match/MatchLogsRecordParity.test.tsx components/match/MatchLogsView.test.tsx"

echo ============================================================
echo 1/5  TYPECHECK
echo ============================================================
call npm run typecheck
if errorlevel 1 goto fail

echo.
echo ============================================================
echo 2/5  ESLINT (changed files)
echo ============================================================
call npx eslint %FILES%
if errorlevel 1 goto fail

echo.
echo ============================================================
echo 3/5  TARGETED TESTS
echo ============================================================
call npx vitest run components/match/MatchLogsRecordParity.test.tsx components/match/MatchLogsView.test.tsx
if errorlevel 1 goto fail

echo.
echo ============================================================
echo 4/5  FULL TEST SUITE
echo ============================================================
call npm test
if errorlevel 1 goto fail

echo.
echo ============================================================
echo 5/5  BUILD
echo ============================================================
call npm run build
if errorlevel 1 goto fail

echo.
echo ============================================================
echo COMMIT
echo ============================================================
git add %FILES%
if errorlevel 1 goto fail
git commit -m "feat(match-logs): show lifetime chicken records and filtered summary"
if errorlevel 1 goto fail
echo.
echo COMMIT HASH:
git rev-parse --short HEAD
echo.
echo ALL CHECKS PASSED.
pause
exit /b 0

:fail
echo.
echo ============================================================
echo FAILED. Copy the error above and send it back.
echo ============================================================
pause
exit /b 1
