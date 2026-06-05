# Contributing to School Digital Timetable Display System

Thank you for your interest in contributing to this project! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to:
- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what is best for the school community
- Show empathy towards other contributors

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/school-timetable.git`
3. Create a new branch: `git checkout -b feature/your-feature-name`
4. Install dependencies for both frontend and backend
5. Set up your environment variables (copy from `.env.example`)

## Development Process

### Setting Up Development Environment

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your settings
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm start
```

### Database Setup

```bash
cd backend
npm run init-db
```

## Coding Standards

### TypeScript

- Use strict TypeScript settings
- Define explicit return types for functions
- Use interfaces for object shapes
- Avoid `any` type - use `unknown` if necessary

```typescript
// Good
interface User {
  id: number;
  name: string;
}

function getUser(id: number): Promise<User> {
  // implementation
}

// Bad
function getUser(id) {
  // implementation
}
```

### React Components

- Use functional components with hooks
- Keep components focused and small
- Use meaningful component names
- Add PropTypes or TypeScript interfaces

```typescript
// Good
interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  // implementation
};
```

### CSS/Styling

- Use CSS modules or styled-components
- Follow BEM methodology for class names
- Use CSS variables for theming
- Ensure responsive design

### API Endpoints

- Use consistent naming conventions
- Return proper HTTP status codes
- Include error messages in responses
- Document all endpoints

## Commit Messages

Use conventional commits format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/dependency changes

Examples:
```
feat(timetable): add automatic schedule detection
fix(api): resolve database connection timeout
docs(readme): update installation instructions
```

## Pull Request Process

1. Update your fork to the latest main branch
2. Run all tests and linting
3. Update documentation if needed
4. Create a descriptive PR title
5. Fill out the PR template completely
6. Request review from maintainers

### PR Checklist

- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] Commit messages follow conventions
- [ ] No console errors or warnings
- [ ] Responsive design tested
- [ ] Accessibility considerations addressed

## Testing

### Running Tests

```bash
# Frontend
cd frontend
npm test

# Backend
cd backend
npm test
```

### Test Coverage

- Aim for >80% code coverage
- Write tests for new features
- Update tests when modifying existing code
- Include both unit and integration tests

## Questions?

If you have questions, please:
1. Check existing issues and documentation
2. Create a new issue with the "question" label
3. Join our community discussions

Thank you for contributing!
