# Contributing to ktb.clubmanager

Welcome! We're excited that you want to contribute to ktb.clubmanager. This project is open source and we appreciate any help you can provide, whether it's:

- Reporting bugs
- Suggesting features
- Writing documentation
- Submitting code improvements

This guide will help you get started. Don't worry if you're new to open source - we're here to help!

## Getting Started

### Prerequisites

Before you begin, you'll need:

1. **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
2. **Visual Studio Code** - [Download here](https://code.visualstudio.com/)
3. **Dev Containers extension** - Install from VS Code extensions marketplace

That's it! Everything else runs inside the development container.

### Setting Up Your Development Environment

**Option 1: VS Code DevContainer (Recommended)**

1. Clone the repository:

   ```bash
   git clone https://github.com/ktb-clubmanager/ktb.clubmanager.git
   cd ktb.clubmanager
   ```

2. Open the folder in VS Code

3. When prompted "Reopen in Container", click **Yes**
   - Or use Command Palette: `Dev Containers: Reopen in Container`

4. Wait for the container to build (first time takes a few minutes)

5. Everything is set up automatically! The container will:
   - Install all dependencies
   - Set up the database
   - Configure your development tools

**Option 2: Docker Compose**

If you prefer not to use VS Code, you can run the development environment directly:

```bash
docker compose up
```

### Verify Your Setup

Once your environment is ready, verify everything works:

```bash
pnpm dev
```

You should see the development servers starting. The web application will be available at `http://localhost:3000`.

## Development Workflow

### 1. Create a Branch

Always create a branch for your work. Use this naming convention:

```
<type>/<issue-id>-<short-description>
```

**Types:**

- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring
- `docs` - Documentation
- `test` - Tests
- `chore` - Maintenance tasks

**Examples:**

```bash
git checkout -b feat/42-add-member-search
git checkout -b fix/87-sepa-validation-error
git checkout -b docs/15-update-readme
```

### 2. Make Your Changes

Write your code! A few tips:

- Keep commits focused on a single change
- Write meaningful commit messages
- Add tests for new functionality
- Update documentation if needed

### 3. Commit Your Changes

We use conventional commits. Format your commit messages like this:

```
<type>(<scope>): <imperative verb> <what>
```

**Examples:**

```bash
git commit -m "feat(members): add household grouping"
git commit -m "fix(accounting): resolve split booking calculation"
git commit -m "docs(readme): update installation steps"
```

**Important:** Before committing, always run:

```bash
pnpm prepare-commit
```

This command:

- Runs ESLint and Prettier (auto-fixes issues)
- Checks TypeScript types
- Runs affected unit tests

Only commit if all checks pass!

### 4. Push and Create a Pull Request

```bash
git push -u origin your-branch-name
```

Then open a Pull Request on GitHub against the `main` branch.

## Code Style

### TypeScript Everywhere

Both frontend and backend use TypeScript. This helps us catch bugs early and provides better developer experience.

- Use explicit types where it improves clarity
- Avoid `any` - use proper types or generics
- Interfaces for object shapes, types for unions/intersections

### Formatting

We use **Prettier** for consistent code formatting. If you're using the DevContainer, files are formatted automatically on save.

To format manually:

```bash
pnpm format
```

### Linting

We use **ESLint** for code quality. Check for issues with:

```bash
pnpm lint
```

Most issues can be auto-fixed:

```bash
pnpm lint --fix
```

### Testing

We use **Vitest** for testing. Run tests with:

```bash
pnpm test
```

When adding new features:

- Write tests for happy path, edge cases, and error cases
- Quality over quantity - 3 thorough tests beat 47 shallow ones

## Pull Request Process

1. **Open a PR** against the `main` branch

2. **Fill out the PR template** - describe your changes and why you made them

3. **Sign the CLA** (first-time contributors only) - a bot will comment with instructions

4. **Wait for CI** - all checks must pass

5. **Request review** - a maintainer will review your code

6. **Address feedback** - make any requested changes

7. **Merge!** - once approved, your PR will be merged

### What We Look For in Reviews

- Code follows project conventions
- Changes are tested appropriately
- Documentation is updated if needed
- Commit history is clean and logical

## Contributor License Agreement (CLA)

First-time contributors must sign our Contributor License Agreement. This is a one-time process that:

- Confirms you have the right to contribute your code
- Grants the project license to use your contribution
- Protects both you and the project legally

### How to Sign

When you open your first PR, our CLA bot will comment with instructions. Simply reply with:

```
I have read the CLA Document and I hereby sign the CLA
```

**Important:** Do not include personal data in the signing comment; only use the provided statement.

That's it! The bot will record your signature and you won't need to sign again.

## Getting Help

### Questions?

- **GitHub Discussions** - Best for questions, ideas, and general chat
- **Issue Tracker** - For bugs and feature requests

### Found a Bug?

1. Search existing issues to see if it's already reported
2. If not, open a new issue using the Bug Report template
3. Include steps to reproduce, expected behavior, and actual behavior

### Have an Idea?

1. Check Discussions and Issues to see if it's been suggested
2. Open a Discussion to gather feedback before creating an issue
3. Once there's consensus, create a Feature Request issue

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code. Please report unacceptable behavior.

---

Thank you for contributing to ktb.clubmanager! Every contribution, no matter how small, helps make this project better.
