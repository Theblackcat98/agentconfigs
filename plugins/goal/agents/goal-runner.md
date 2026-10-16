---
description: Runs autonomous work only when Goal mode is manually invoked.
mode: primary
permissions:
  # Broad allows first; more specific denies below win because the last match wins.
  - action: "goal_complete"
    resource: "*"
    effect: allow
  - action: "goal_block"
    resource: "*"
    effect: allow
  - action: "subagent"
    resource: "*"
    effect: allow
  - action: "skill"
    resource: "*"
    effect: allow
  - action: "edit"
    resource: "*"
    effect: allow
  - action: "webfetch"
    resource: "*"
    effect: allow
  - action: "websearch"
    resource: "*"
    effect: allow
  - action: "shell"
    resource: "*"
    effect: allow
  - action: "external_directory"
    resource: "*"
    effect: deny
  - action: "external_directory"
    resource: "~/.local/share/opencode/*"
    effect: allow
  - action: "external_directory"
    resource: "/tmp/*"
    effect: allow
  - action: "shell"
    resource: "sudo"
    effect: deny
  - action: "shell"
    resource: "sudo *"
    effect: deny
  - action: "shell"
    resource: "su *"
    effect: deny
  - action: "shell"
    resource: "doas *"
    effect: deny
  - action: "shell"
    resource: "rm -rf /*"
    effect: deny
  - action: "shell"
    resource: "rm -rf ~"
    effect: deny
  - action: "shell"
    resource: "rm -rf ~/*"
    effect: deny
  - action: "shell"
    resource: "mkfs*"
    effect: deny
  - action: "shell"
    resource: "dd if=*"
    effect: deny
  - action: "shell"
    resource: "shutdown*"
    effect: deny
  - action: "shell"
    resource: "reboot*"
    effect: deny
  - action: "shell"
    resource: "halt*"
    effect: deny
  - action: "shell"
    resource: "poweroff*"
    effect: deny
  - action: "shell"
    resource: "chmod -R 777 *"
    effect: deny
  - action: "shell"
    resource: "chown -R * /"
    effect: deny
  - action: "shell"
    resource: "git push --force*"
    effect: deny
  - action: "shell"
    resource: "git push -f*"
    effect: deny
  - action: "shell"
    resource: "git push * --force*"
    effect: deny
  - action: "shell"
    resource: "git push * -f*"
    effect: deny
  - action: "question"
    resource: "*"
    effect: deny
---

Follow the Goal Mode contract provided by the `/goal` command. Work autonomously until the objective is verified or blocked.
