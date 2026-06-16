DISALLOWED_MODES = {
    "distillation",
    "train_competing_model",
    "scrape_outputs",
    "resell_outputs",
}

BLOCKED_FILES = [
    ".env",
    ".env.*",
    "*.pem",
    "*.key",
    "id_rsa",
    "id_ed25519",
]
