# Security policy

## Reporting a vulnerability

Please do **not** report a security problem in a public issue, pull request or
forum post.

Report it privately through GitHub instead: open the **Security** tab of this
repository, then **Report a vulnerability**.

No such button? Private reporting is not enabled yet: open an issue that only
asks the maintainers for a private contact, without any detail of the problem,
and send the report there.

Include, when you can:

- the version of the integration and of Gladys;
- what an attacker can do, and the steps to reproduce it;
- the log lines that help (remove tokens, passwords and addresses first).

The fix ships as a new version of the integration, and the advisory is
published once users can update.

## Supported versions

Only the latest release receives security fixes: update the integration from
Gladys before reporting a problem.

## Scope

In scope: the code of this repository and the Docker image it publishes.

What the integration handles:

- **No secret.** IPMA's open data needs no account, password or key, and the
  configuration holds none.
- **The position of the houses of Gladys** (manifest `location: true`): read
  only when the user presses "Use the location nearest to a house", used to
  pick the nearest IPMA location, never stored nor written to the logs. Only
  the chosen IPMA location id is saved in the configuration.
- **`/data`**, the only writable volume, holds one file:
  `announced-warnings.json`, the IPMA warnings already announced to the scene
  trigger (public data), forgotten a day after their end.
- **Network**: outgoing HTTPS requests to `api.ipma.pt` only, read only. No
  port is opened, nothing is listened to on the local network.

Out of scope: Gladys Assistant itself (see its
[security policy](https://github.com/GladysAssistant/Gladys/security/policy)),
and IPMA's services.
