# n8n-nodes-data-quality-toolkit

A lightweight n8n community node for validating, cleaning, comparing, and scoring workflow data before sending it to CRMs, APIs, databases, or AI systems.

This node intentionally uses **no runtime external dependencies**. All validation and cleaning logic is implemented with native TypeScript/JavaScript to keep the package simple and suitable for community-node review.

## Operations

### Validate Fields
Checks configured fields for:

- Required value
- Empty string handling
- Basic type validation: string, number, boolean, email, URL, date, phone

Output example:

```json
{
  "customer": {
    "email": "test@example.com"
  },
  "dataQuality": {
    "valid": true,
    "errors": []
  }
}
```

### Clean Object
Cleans incoming item JSON by:

- Trimming strings
- Collapsing repeated whitespace
- Optionally removing empty fields

### Find Missing Values
Checks a comma-separated list of required dot-path fields and returns missing fields.

Example field list:

```text
customer.name, customer.email, order.id
```

### Compare Records
Compares two objects, usually `before` and `after`, and returns changed fields.

Expected input example:

```json
{
  "before": { "name": "ABC", "revenue": 100 },
  "after": { "name": "ABC", "revenue": 150 }
}
```

### Generate Quality Report
Runs field validation and returns a simple score from 0 to 100.

## Why this node is useful

Many workflows fail because bad or incomplete data reaches the next system. This node gives workflow builders a reusable place to validate and clean data before calling APIs such as CRMs, billing systems, spreadsheets, databases, or AI extraction steps.

## Installation for local testing

```bash
npm install
npm run build
npm link
```

Then link it inside your n8n custom folder:

```bash
mkdir -p ~/.n8n/custom
cd ~/.n8n/custom
npm link n8n-nodes-data-quality-toolkit
```

Restart n8n.

## Docker self-hosted example

If you keep custom nodes in `C:/n8n-custom` on Windows:

```bash
docker run -it --rm \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  -v C:/n8n-custom:/home/node/.n8n/custom \
  -e N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom \
  n8nio/n8n
```

Build this package and copy/link it under the mounted custom folder.

## Publishing

Before publishing:

```bash
npm run lint
npm run build
npm publish --provenance --access public
```

For n8n community-node verification, keep runtime dependencies empty, publish from GitHub Actions with provenance, and ensure the package name starts with `n8n-nodes-`.

## License

MIT

## Tests

This package uses Node.js built-in test runner, so there are no test-framework runtime dependencies.

```bash
npm install
npm test
```

The tests cover the core no-dependency helper logic:

- empty value detection
- nested path reads/writes
- email, URL, phone, date, number and boolean validation
- string/object cleaning
- changed-field comparison between records

## Release process

For n8n community-node submission, prefer publishing from GitHub Actions so npm provenance is attached.

Dry run:

```bash
npm run release:dry-run
```

Patch release:

```bash
npm run release:patch
```

Then push the version commit and tag:

```bash
git push --follow-tags
```

Create a GitHub Release for the new tag. The included `.github/workflows/publish.yml` workflow will run tests and publish to npm with provenance.
