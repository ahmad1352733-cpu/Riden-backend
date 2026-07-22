---
    name: FCM Delivery Confirmed — Root Cause Analysis
    description: Backend sends trip notifications successfully; device doesn't show them
    ---

    ## Finding (2026-07-22)
    After fixing Railway dist-cache issue (Dockerfile now builds from source via serviceInstanceDeploy latestCommit:true), structured logs confirm:

    - **PASSENGER_NOTIFICATION_SEND_SUCCESS** appears for both accept and start events
    - **FCM v1 ✓** with real message name (e.g. projects/riden2/messages/0:1784718737...)
    - **success=1 failure=0** for all passenger notifications

    ## Root Cause
    Issue is NOT in backend. FCM confirms delivery. Problem is device-side:
    1. Android notification channel `trip-updates` might not be registered on device
    2. Battery optimization / Doze mode blocking display
    3. App-specific notification permission revoked by user

    ## Railway Deploy Fix
    **Critical**: `serviceInstanceRedeploy` reuses old Docker image (same snapshot hash). 
    Must use `serviceInstanceDeploy(latestCommit: true)` to build from latest git commit.

    **Workflow**: push to git → call serviceInstanceDeploy latestCommit:true → wait ~5min for build from source

    ## Dockerfile Fix
    - Old: copies pre-built dist (3-step Dockerfile, Railway cached snapshot bypasses changes)
    - New: multi-stage, builds from source (pnpm install + build.mjs via esbuild)
    - Use `--no-frozen-lockfile` (not --frozen-lockfile) due to pnpm overrides mismatch with --filter

    ## Other Captains
    Other captains (test accounts) have no push_token → OTHER_DRIVERS not notified in test. Expected.
    