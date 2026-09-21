# Automation & Systems Integration

I build practical automations for creators, consultants, and small teams that are tired of moving information between tools by hand.

The focus is simple: remove repetitive work, connect the tools you already use, and leave you with a system you can actually operate.

## Typical projects

- Notion-centered operations systems
- API and webhook integrations
- Forms → databases / CRM workflows
- Notifications and handoffs
- Content approval and creator operations
- Recurring reporting and research intake
- Cloud workflows and lightweight custom integrations
- Debugging automations that are unreliable or unnecessarily complicated

## Launch packages

| Package | Price | Deliverable |
| --- | ---: | --- |
| Workflow Audit & Blueprint | $99 | Map one workflow, identify manual/failure points, and deliver a concrete automation architecture with implementation steps. |
| Starter Automation | $299 | Build and test one bounded workflow connecting roughly 2–3 systems with basic error handling and handoff documentation. |
| Operations System | $599 | Build a multi-step workflow with integrations, human approval points, monitoring/error handling, and documentation. |
| Maintenance | $79/month | Light monitoring, small fixes, dependency/API updates, and monthly review for a delivered system. |

These are launch prices for bounded projects. Larger or materially different scopes are quoted separately.

## Proof of work

### Cloud-native operations core

**Problem:** Multiple workflows, schedules, monitoring lanes, files, and projects needed one durable operating system without depending on an always-on local server.

**Result:** A modular architecture that separates durable state, cloud execution, scheduling, monitoring, files, and device-only functions so each layer has clear ownership.

### Authenticated cloud-to-device automation

**Problem:** Cloud-generated output needed to reach an Android device without exposing webhook credentials or running a permanent local server.

**Result:** An authenticated Vercel → webhook → Android workflow with secret isolation, target validation, observability, and failure debugging. The production path was verified end-to-end for single execution.

### Creator publishing operations

**Problem:** Large media files, automation-platform limits, and retries created duplicate-upload and data-transfer risk.

**Result:** Heavy media transport was separated from lightweight automation, with human review preserved before publication and automation limited to the parts where it actually added reliability.

## Working principle

> Give me the workflow you are tired of doing by hand. I will map it, simplify it, automate what should be automated, and document the finished system.

Best fit: an existing repetitive process with a clear desired result, especially when two or more tools need to exchange data or coordinate work.

## Make referral

If you need a Make account for a workflow, you can use my **[Make affiliate registration link](https://www.make.com/en/register?pc=uherelyt)**.

Disclosure: this is an affiliate link. I may earn a commission if you sign up through it, at no added cost to you. I only recommend Make when it fits the workflow.

## Start a project

The public booking/service surface is **[Workflow Automation with Notion, APIs & Webhooks on Contra](https://contra.com/s/FRcObFBN-workflow-automation-with-notion-ap-is-and-webhooks)**.

Technical proof and project history remain public on **[@uherelyt](https://github.com/uherelyt)**.

Do not post credentials, private API keys, customer data, or other secrets in public issues or messages.
