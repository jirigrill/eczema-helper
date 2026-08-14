#!/usr/bin/env bash
# Interactive walkthrough: zero iOS toolchain -> Apple Developer Program membership
# able to file an App Review query and, later, build and ship.
#
# Ticket: https://github.com/jirigrill/eczema-helper/issues/676
#
# Every step here is browser-and-payment work an agent cannot do. This script
# does what it can (checks, installs, opens the right page), then blocks and
# tells you exactly what to click. Re-runnable: it re-checks state each run and
# skips what is already done.
#
# Progress is saved, so you can quit at any prompt and resume later.

set -uo pipefail

STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/eczema-ios-setup"
STATE_FILE="$STATE_DIR/progress.env"
mkdir -p "$STATE_DIR"
[[ -f "$STATE_FILE" ]] && source "$STATE_FILE"

BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'; GREEN=$'\033[32m'
YELLOW=$'\033[33m'; BLUE=$'\033[34m'; RESET=$'\033[0m'

say()   { printf '%s\n' "$*"; }
head2() { printf '\n%s%s%s\n' "$BOLD" "$*" "$RESET"; }
ok()    { printf '%s  ok%s  %s\n' "$GREEN" "$RESET" "$*"; }
warn()  { printf '%s  !!%s  %s\n' "$YELLOW" "$RESET" "$*"; }
bad()   { printf '%s  xx%s  %s\n' "$RED" "$RESET" "$*"; }
info()  { printf '%s      %s%s\n' "$DIM" "$*" "$RESET"; }

save() { # save KEY VALUE
  local k="$1" v="$2"
  [[ -f "$STATE_FILE" ]] && grep -v "^${k}=" "$STATE_FILE" > "$STATE_FILE.tmp" 2>/dev/null || : > "$STATE_FILE.tmp"
  printf '%s=%q\n' "$k" "$v" >> "$STATE_FILE.tmp"
  mv "$STATE_FILE.tmp" "$STATE_FILE"
  printf -v "$k" '%s' "$v" 2>/dev/null || eval "$k=\$v"
}

pause() { # pause "instruction"
  printf '\n%s%s%s\n' "$BLUE" "$*" "$RESET"
  printf '%sPress return when done, or Ctrl-C to stop and resume later.%s ' "$DIM" "$RESET"
  read -r _ || exit 0
}

ask() { # ask VAR "prompt"
  local var="$1" prompt="$2" cur="${!1:-}" reply
  if [[ -n "$cur" ]]; then
    printf '%s [%s]: ' "$prompt" "$cur"
  else
    printf '%s: ' "$prompt"
  fi
  read -r reply || exit 0
  [[ -z "$reply" ]] && reply="$cur"
  save "$var" "$reply"
}

confirm() { # confirm "question"  -> 0 yes / 1 no
  local reply
  printf '%s [y/N]: ' "$*"
  read -r reply || exit 0
  [[ "$reply" =~ ^[Yy] ]]
}

open_url() {
  say "  opening: $1"
  open "$1" 2>/dev/null || info "could not open a browser - visit the URL above manually"
}

# ---------------------------------------------------------------------------

clear 2>/dev/null || true
cat <<'BANNER'
===========================================================================
  eczema-ios : environment setup
===========================================================================
BANNER

say "This gets you from no iOS toolchain to a working Apple Developer account."
say "It does the machine checks; you do the browser and payment steps."
say ""
info "state file: $STATE_FILE"
info "safe to quit at any prompt - progress is saved"

# --- Step 0: preflight -----------------------------------------------------

head2 "Step 0 / 7  -  Machine preflight"

MACOS="$(sw_vers -productVersion)"
say "  macOS $MACOS ($(sw_vers -buildVersion))"
MACOS_MAJOR="${MACOS%%.*}"
MACOS_MINOR="${MACOS#*.}"; MACOS_MINOR="${MACOS_MINOR%%.*}"
[[ "$MACOS_MINOR" == "$MACOS" ]] && MACOS_MINOR=0
# Xcode 27 requires macOS 26.4 or later (Apple release notes, verified 2026-08-14).
if (( MACOS_MAJOR > 26 )) || { (( MACOS_MAJOR == 26 )) && (( MACOS_MINOR >= 4 )); }; then
  ok "meets the macOS 26.4+ floor for Xcode 27"
else
  bad "Xcode 27 requires macOS 26.4 or later - you have $MACOS."
  info "Update macOS before continuing, or install Xcode 26.6 instead (and see"
  info "the note in step 1 about which Xcode this project targets)."
  confirm "Continue anyway?" || exit 1
fi

ARCH="$(uname -m)"
say "  architecture: $ARCH"

DISK_FREE_G="$(df -g / | awk 'NR==2 {print $4}')"
say "  free disk: ${DISK_FREE_G} GB"
if (( DISK_FREE_G < 60 )); then
  bad "Xcode needs roughly 40 GB installed and more while unpacking."
  bad "You have ${DISK_FREE_G} GB. Free up space before continuing."
  confirm "Continue anyway?" || exit 1
else
  ok "enough room for Xcode"
fi

# --- Step 1: Xcode ---------------------------------------------------------

head2 "Step 1 / 7  -  Install Xcode 27"

# Decided in #699: Xcode 27.0 beta 5 now, upgrading to 27.0 stable at GM
# (~2026-09-14), building against the iOS 27 SDK but deploying to iOS 26.
#
# Two consequences for this step:
#   - A beta is NOT on the Mac App Store. It is a manual download from the
#     developer portal, which needs a signed-in Apple Account (a free one is
#     enough to download; the paid membership in step 3 is not required yet).
#   - Only ONE Xcode may be installed. With 26 and 27 both present,
#     XcodeBuildMCP 2.7.0 opens the beta-only Device Hub even when
#     DEVELOPER_DIR selects the other one (getsentry/XcodeBuildMCP#513).

# macOS ships bash 3.2, which has no mapfile/readarray - build the array by hand.
XCODE_APPS=()
while IFS= read -r line; do
  [[ -n "$line" ]] && XCODE_APPS+=("$line")
done < <(ls -d /Applications/Xcode*.app 2>/dev/null || true)

if (( ${#XCODE_APPS[@]} > 1 )); then
  bad "more than one Xcode is installed:"
  for a in "${XCODE_APPS[@]}"; do info "$a"; done
  say ""
  bad "Keep exactly one. Delete the others before continuing - see the"
  bad "Device Hub note above; the failure is silent and hard to diagnose."
  confirm "Continue anyway?" || exit 1
fi

XCODE_APP="${XCODE_APPS[0]:-}"
if [[ -n "$XCODE_APP" ]]; then
  ok "found $XCODE_APP"
else
  bad "Xcode is not installed."
  say ""
  say "  This project targets Xcode 27, which while in beta is a manual download"
  say "  from the developer portal - NOT the Mac App Store (that ships 26.6)."
  say ""
  say "  On the page that opens: sign in, find the newest Xcode 27 release,"
  say "  download the .xip, then double-click it to unpack (it is ~10 GB and"
  say "  unpacking takes a while) and move Xcode.app to /Applications."
  say ""
  info "The Command Line Tools you already have can compile Swift but cannot"
  info "build an iOS app or run a simulator. Full Xcode is required."
  info "Once 27.0 stable ships (~14 Sept 2026) the Mac App Store is the easier"
  info "route: macappstore://apps.apple.com/app/xcode/id497799835"
  open_url "https://developer.apple.com/download/applications/"
  pause "Install Xcode into /Applications, then open it once so it can install its additional components."
  XCODE_APPS=()
  while IFS= read -r line; do
    [[ -n "$line" ]] && XCODE_APPS+=("$line")
  done < <(ls -d /Applications/Xcode*.app 2>/dev/null || true)
  XCODE_APP="${XCODE_APPS[0]:-}"
  if [[ -z "$XCODE_APP" ]]; then
    bad "Still no Xcode in /Applications. Stopping here - re-run this script when it has installed."
    exit 1
  fi
  ok "found $XCODE_APP"
fi

# Point the active developer directory at Xcode, not the CLT.
ACTIVE_DIR="$(xcode-select -p 2>/dev/null || true)"
say "  active developer directory: ${ACTIVE_DIR:-none}"
if [[ "$ACTIVE_DIR" != *"Xcode"* ]]; then
  warn "still pointing at the Command Line Tools - switching it (needs your password)"
  sudo xcode-select -s "$XCODE_APP/Contents/Developer" \
    && ok "switched to $XCODE_APP" \
    || { bad "could not switch. Run: sudo xcode-select -s \"$XCODE_APP/Contents/Developer\""; exit 1; }
else
  ok "already pointing at Xcode"
fi

# The licence must be accepted before xcodebuild will do anything.
if ! xcodebuild -version >/dev/null 2>&1; then
  warn "Xcode licence not yet accepted - accepting it (needs your password)"
  sudo xcodebuild -license accept || { bad "licence not accepted; run: sudo xcodebuild -license accept"; exit 1; }
fi

if XB="$(xcodebuild -version 2>/dev/null | head -1)"; then
  ok "$XB"
  XCODE_VER="${XB##* }"
  if [[ "${XCODE_VER%%.*}" == "27" ]]; then
    ok "Xcode 27 as decided in #699"
  else
    warn "this is Xcode $XCODE_VER, but the project targets Xcode 27 (#699)"
    info "26.x will build the app, but you would be on a different toolchain"
    info "than CI and than the agents' instructions assume. Prefer 27."
    confirm "Continue with Xcode $XCODE_VER anyway?" || exit 1
  fi
else
  bad "xcodebuild still not working. Open Xcode once, let it finish installing components, then re-run."
  exit 1
fi

if xcrun simctl list runtimes 2>/dev/null | grep -qi "iOS"; then
  ok "an iOS simulator runtime is present"
else
  warn "no iOS simulator runtime found"
  info "Xcode > Settings > Components - install an iOS simulator runtime"
  pause "Install an iOS simulator runtime, then continue."
fi

save XCODE_PATH "$XCODE_APP"

# --- Step 2: Apple Account -------------------------------------------------

head2 "Step 2 / 7  -  Apple Account for the developer identity"

say "  Decide which Apple Account owns the developer membership before paying."
say "  It becomes the permanent owner of the app records, the certificates and"
say "  the App Store listing, and it is painful to change later."
say ""
info "A personal iCloud account is fine. Using a shared or work account is not -"
info "you would be shipping a product under an identity you do not control."
say ""
info "Note on ordering: step 1's beta download needed you signed in to the"
info "developer portal. A free Apple Account is enough for that, so downloading"
info "Xcode 27 does not require the paid membership below - but use the SAME"
info "account for both, or the signing setup in step 4 will not see your team."

ask APPLE_ID "  Apple Account email to enrol with"
[[ -n "${APPLE_ID:-}" ]] && ok "using $APPLE_ID"

say ""
say "  Two-factor authentication is mandatory for the Developer Program."
confirm "  Is 2FA already enabled on that account?" \
  && ok "2FA confirmed" \
  || { open_url "https://account.apple.com/account/manage/section/security"
       pause "Enable two-factor authentication on that account, then continue."; }

# --- Step 3: Developer Program enrolment -----------------------------------

head2 "Step 3 / 7  -  Apple Developer Program enrolment  (\$99/yr)"

say "  This is the step that actually gates the project: filing an App Review"
say "  query needs a developer account, and that query is on the critical path."
say ""
say "  Enrol as an ${BOLD}individual${RESET} - that is the decision already taken for v1."
say ""
warn "Known and accepted tradeoff:"
info "App Store Review Guideline 5.1.1(ix) says apps in regulated fields including"
info "healthcare 'should be submitted by a legal entity, not an individual"
info "developer'. You are proceeding as an individual knowingly. It is a"
info "rejection risk at submission, not at enrolment."
info ""
info "Separately, the insurance research (issue #681) leans toward an s.r.o."
info "because the Czech products that cover software as a product are shaped for"
info "companies. If that becomes decisive you would re-enrol as an organisation,"
info "which needs a D-U-N-S number and takes weeks. Nothing here blocks on it."
say ""
say "  Enrolment can be approved in minutes or take a couple of days."
say "  Apple may ask for photo ID."

if [[ "${ENROLLED:-}" == "yes" ]]; then
  ok "recorded as enrolled on a previous run"
else
  open_url "https://developer.apple.com/programs/enroll/"
  pause "Complete enrolment and payment. If Apple puts it in review, stop here and re-run this script once it is approved."
  if confirm "  Is the membership active now?"; then
    save ENROLLED yes
    ok "enrolment recorded"
  else
    warn "Not active yet. Stopping - re-run this script when Apple approves it."
    info "Everything up to this point is saved."
    exit 0
  fi
fi

say ""
say "  Your Team ID is on the membership page, and it is needed for signing,"
say "  the CloudKit container and App Store Connect."
open_url "https://developer.apple.com/account#MembershipDetailsCard"
ask TEAM_ID "  Team ID (10 characters, e.g. A1B2C3D4E5)"
if [[ "${TEAM_ID:-}" =~ ^[A-Z0-9]{10}$ ]]; then
  ok "Team ID $TEAM_ID looks well-formed"
else
  warn "'${TEAM_ID:-}' is not the usual 10-character format - double-check it"
fi

# --- Step 4: signing -------------------------------------------------------

head2 "Step 4 / 7  -  Signing certificates and provisioning"

say "  Do not create certificates by hand. Sign in to Xcode and let it manage"
say "  signing automatically - it creates and renews the development certificate"
say "  and provisioning profiles for you."
say ""
say "  Xcode > Settings > Accounts > + > Apple ID, then sign in as"
say "  ${APPLE_ID:-your developer account}."
say ""
info "Manual certificates expire and break builds in ways that are hard to"
info "diagnose with no iOS experience. Automatic signing is the right default"
info "and stays right until you set up CI."

open -a "$XCODE_APP" 2>/dev/null || true
pause "Add the developer account in Xcode > Settings > Accounts, then continue."

if security find-identity -v -p codesigning 2>/dev/null | grep -qE "Apple Develop(er|ment)"; then
  ok "an Apple development signing identity is now present"
  save SIGNING_OK yes
else
  warn "no Apple development identity found in the keychain yet"
  info "It usually appears after Xcode builds a real project once - expected at"
  info "this stage, since there is no Xcode project yet. Not a blocker."
  info "Existing non-Apple identities in your keychain are unrelated to this."
fi

# --- Step 5: bundle id -----------------------------------------------------

head2 "Step 5 / 7  -  Bundle identifier"

say "  The bundle id is permanent once an app record exists. It also determines"
say "  the conventional CloudKit container name, so it is worth a moment."
say ""
say "  Reverse-DNS, e.g. me.nofiat.eczema - use a domain you actually control."
say ""
warn "The product has no English name yet (issue #697)."
info "The bundle id does NOT have to contain the product name, and it is never"
info "shown to users. Pick something neutral and stable now rather than waiting"
info "for the name, or waiting will block the CloudKit container."

ask BUNDLE_ID "  Bundle identifier"
if [[ "${BUNDLE_ID:-}" =~ ^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$ ]]; then
  ok "$BUNDLE_ID is well-formed"
else
  warn "'${BUNDLE_ID:-}' does not look like reverse-DNS - Apple will reject it"
fi

# --- Step 6: CloudKit container -------------------------------------------

head2 "Step 6 / 7  -  CloudKit container"

say "  CloudKit is load-bearing: it is the only reason the app survives"
say "  delete-and-reinstall, which is a hard requirement."
say ""
warn "Read this before creating the container:"
info "Whether App Store Guideline 5.1.3(ii) - 'may not store personal health"
info "information in iCloud' - reaches an app's own CloudKit private database is"
info "GENUINELY UNSETTLED. Apple has never stated it. See issue #675, and #685"
info "for the query being filed."
info ""
info "Creating a container commits nothing and costs nothing. Shipping on it"
info "before an answer is the risk. Research on #675 concluded: build local-first"
info "with export first, and the App Review answer leaves the critical path."

if confirm "  Create the CloudKit container now?"; then
  say "  In the Developer portal: Certificates, Identifiers & Profiles >"
  say "  Identifiers > + > iCloud Containers."
  say "  Convention: iCloud.${BUNDLE_ID:-your.bundle.id}"
  open_url "https://developer.apple.com/account/resources/identifiers/list/cloudContainer"
  pause "Create the container, then continue."
  ask CLOUDKIT_CONTAINER "  Container identifier you created"
  ok "recorded ${CLOUDKIT_CONTAINER:-}"
else
  info "Skipped. Re-run this script later to do it - nothing downstream in this"
  info "wizard depends on it."
fi

# --- Step 7: App Store Connect --------------------------------------------

head2 "Step 7 / 7  -  App Store Connect record"

say "  An App Store Connect app record is needed to file an App Review query"
say "  and to use TestFlight. Creating one does not publish anything."
say ""
warn "The app record wants a name, and the name is not decided (issue #697)."
info "App names can be changed until the version is submitted for review, so a"
info "placeholder is safe. The BUNDLE ID cannot be changed - that is the one to"
info "get right, and you did it in step 5."

if confirm "  Create the App Store Connect record now?"; then
  open_url "https://appstoreconnect.apple.com/apps"
  say "  My Apps > + > New App. Platform iOS, bundle id ${BUNDLE_ID:-<from step 5>},"
  say "  category ${BOLD}Health & Fitness${RESET} (decision already taken)."
  pause "Create the app record, then continue."
  save ASC_RECORD yes
  ok "app record recorded"
else
  info "Skipped. Note this blocks filing the App Review query in issue #685."
fi

# --- Deliberately not done here -------------------------------------------

head2 "Known-pending  -  deliberately NOT in this wizard"

say "  These are real obligations, left out because they depend on decisions the"
say "  project has not made yet. Doing them now would mean guessing."
say ""
say "  ${BOLD}EU DSA trader status${RESET}  -  MANDATORY, and non-compliance means removal"
say "    from the EU App Store. Needs a published address (a P.O. box is"
say "    accepted), phone and email. Not blocking until you submit, but it is"
say "    the one on this list with a hard consequence."
say ""
say "  ${BOLD}StoreKit 2 products and subscription group${RESET}  -  the monetization model is"
say "    'paid v1 directly' and nothing finer has been decided. If subscriptions"
say "    ever appear: minimum 7 days, all tiers in one group."
say ""
say "  ${BOLD}Privacy nutrition labels${RESET}  -  shaped by whether CloudKit sync ships and"
say "    whether it is opt-in. Apple's own glossary makes this health data"
say "    regardless of how it is stored (issue #675)."
say ""
say "  ${BOLD}Privacy policy URL${RESET}  -  required for submission. Needs the GDPR Art. 30"
say "    record and the DPIA to exist first (issue #680)."
say ""
say "  ${BOLD}Professional indemnity insurance${RESET}  -  issue #681 found that professional"
say "    indemnity is the wrong instrument, and that generative-AI exclusions"
say "    became widespread on 1 Jan 2026. Check any quote for one before binding."

# --- Summary ---------------------------------------------------------------

head2 "Where you got to"

printf '  %-26s %s\n' "Xcode"              "${XCODE_PATH:-not installed}"
printf '  %-26s %s\n' "Xcode version"      "${XCODE_VER:-unknown} (target: 27.x)"
printf '  %-26s %s\n' "Deployment target"  "iOS 26 - set IPHONEOS_DEPLOYMENT_TARGET = 26.0"
printf '  %-26s %s\n' "Apple Account"      "${APPLE_ID:-not recorded}"
printf '  %-26s %s\n' "Membership"         "$([[ "${ENROLLED:-}" == yes ]] && echo active || echo "not active")"
printf '  %-26s %s\n' "Team ID"            "${TEAM_ID:-not recorded}"
printf '  %-26s %s\n' "Signing identity"   "$([[ "${SIGNING_OK:-}" == yes ]] && echo present || echo "not yet - expected")"
printf '  %-26s %s\n' "Bundle id"          "${BUNDLE_ID:-not recorded}"
printf '  %-26s %s\n' "CloudKit container" "${CLOUDKIT_CONTAINER:-not created}"
printf '  %-26s %s\n' "App Store Connect"  "$([[ "${ASC_RECORD:-}" == yes ]] && echo created || echo "not created")"

say ""
info "saved to $STATE_FILE"
warn "That file holds your Team ID and Apple Account - it is outside the repo on"
warn "purpose. Do not commit it, and do not paste it into a public issue."

head2 "Deployment target: iOS 26, not 27"

say "  Building with Xcode 27 does NOT mean requiring iOS 27. Apple supports"
say "  deployment targets iOS 15-27 from Xcode 27, and iOS 26 is on 79% of"
say "  devices while iOS 27 is on roughly none yet. So the app targets iOS 26."
say ""
warn "The trap: the iOS 27 SDK exposes iOS 27 APIs. Calling one without an"
warn "'if #available' guard is a compile error - or occasionally just a warning"
warn "plus a crash at runtime. Set IPHONEOS_DEPLOYMENT_TARGET = 26.0 in the"
warn "project from the first commit so the compiler enforces the boundary."

head2 "Not in this wizard, by design"

info "The toolchain gates (swiftlint, swiftformat, xcbeautify), XcodeBuildMCP"
info "and its Sentry opt-out, the Justfile and CI all belong to the repo"
info "scaffold in #696, not to this human-setup pass. Decided in #699."

say ""
say "  ${BOLD}Next:${RESET} paste the summary above into issue #676 to close it out."
say "  With a membership active, issue #685 (the App Review query on 5.1.3(ii))"
say "  becomes takeable - it was blocked on exactly this."
say ""
