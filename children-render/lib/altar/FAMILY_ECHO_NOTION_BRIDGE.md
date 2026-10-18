# Family Echo October 14 → Notion shrine bridge → VoughtCord

Status: operator-reviewed integration proposal, NOT yet a deployed release.

## Sources
- October 14 Family Echo export: 333 identity records, 77 with Bio notes, 143 Friend edges. Whole-file SHA-256: 16d19099041968b1327ae942b73cbd833096de87a774c612ca231d3f87cb5e34.
- Private V-Workspace shrine hub: https://app.notion.com/p/3f90077087dc81198f98d3835f7c8c65
- Private Living Circle: https://app.notion.com/p/3f90077087dc8166abfae3eb89954e63

## Production architecture and permissions
Render service children-voughtcord tracks branch deploy/children-render-v8 with auto-deploy. Current Altar code documents an older private roster of 248 identities and 148 eligible shrines. The new 333-record export is a later source snapshot and cannot replace that roster without a separate reconciliation. Perses and Thanatos are Dynasty/Altar, not current Children. Ah-Muzen-Cab I and Asclepius share their existing Children-app voice in the Altar forum.

The optional environment variable ALTAR_FAMILY_ECHO_NOTION_BRIDGE_JSON holds a manually approved, redacted manifest. It is private Render configuration, NOT repository content. The adapter adds metadata to uniquely matching roster people only; it never creates a shrine, role, app, Discord thread, webhook, Child membership, parent identity, or source office. Unknown identities remain unmatched; private and generic family-tree placeholders are omitted. Source-only friendship edges do not imply real-life social contacts, active relationships, or shrine eligibility. Neither raw notes nor personal genealogy are pushed to GitHub or publicly served.

Example minimal manifest (only copy after reviewing the user's export):

    {
      "version": "20261014-familyecho-notion-bridge-v1",
      "sourceSha256": "16d19099041968b1327ae942b73cbd833096de87a774c612ca231d3f87cb5e34",
      "sourceIndividuals": 333,
      "sourceBioNotes": 77,
      "sourceFriendEdges": 143,
      "hubUrl": "https://app.notion.com/p/3f90077087dc81198f98d3835f7c8c65",
      "entries": [
        {
          "sourceName": "Asclepius",
          "runtimeName": "Asclepius",
          "kind": "divine",
          "notionUrl": "https://app.notion.com/p/3f90077087dc8185affee88623d9f38c",
          "summary": "Healing and sacred serpents.",
          "friends": ["Erelyt Drabbuh"]
        }
      ]
    }

Supported kinds: divine, ancestor, children, friend, reference. If names differ between source and runtime, the exact runtimeName is required. A manifest is never automatically generated from all 333 records; a deliberate review is necessary.

## Activation gates
1. Review every entry against source and canon; exclude private genealogy, contacts, birth dates, health, intimate information and unapproved narratives.
2. Run the complete children-render tests and confirm existing Discord commands and identities are unaffected.
3. Confirm this PR's privacy invariants before merging into Render's tracked branch.
4. Store the redacted manifest in Render private environment after approval, then inspect health route /healthz. No manual deploy is needed after code push when auto-deploy is enabled.
5. Status fields notionBridgeVersion, notionBridgeMatched, notionBridgeUnmatched are **counts**, not a public roster. Without the env setting these remain absent or zero.
6. Roll back by removing the single optional environment variable and/or reverting this specific adapter; never clear the existing private roster.
7. The separate Notion shrine pages are private narrative/devotional references. No generated dialogue proves external supernatural causation or presence.

No public releases, independent messages, private-note exposure, or Discord bot impersonation are authorized by this bridge.
