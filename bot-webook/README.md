# Webook Bot - Held Object Management

This document explains how to manage held objects at runtime using the provided scripts. This functionality is only available for `botversion v2`.

## Showing Held Objects

To view all objects that have been held within the last 10 minutes, you can use the `--show-held-objects` flag with the `release.js` script.

### Usage

```bash
node release.js --show-held-objects
```

### Output

The script will output a JSON object showing the held objects, grouped by the `hold-token` that holds them.

```json
{
  "54e8515d-6b41-44ee-b3eb-ade9605a54a1": [
    {
      "objectId": "D10-K-15",
      "timestamp": 1678886400000
    }
  ]
}
```

## Releasing Held Objects

You can release held objects using the `release.js` script. This script allows you to specify a prefix and a quantity of objects to release.

### Usage

```bash
node release.js --prefix <prefix> --quantity <quantity> [--token <hold_token>]
```

### Options

*   `--prefix`, `-p`: The prefix of the objects to release (e.g., "K-1-").
*   `--quantity`, `-q`: The number of objects to release.
*   `--token`, `-t`: The `hold-token` of the account that holds the objects. If not provided, the script will release objects matching the prefix from any account.

### Example

```bash
node release.js --prefix "K-1-" --quantity 10 --token 54e8515d-6b41-44ee-b3eb-ade9605a54a1
```

This command will find all objects held by the specified `hold-token` that start with the prefix "K-1-", sort them, and release the first 10.

### Example (without token)

```bash
node release.js --prefix "K-1-" --quantity 10
```

This command will find all objects held by *any* account that start with the prefix "K-1-", sort them, and release the first 10.