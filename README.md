# PelangiManager

A comprehensive **Capsule System Management Platform** for hostels and capsule hotels, built with modern web technologies.

## 🌐 Live Demo

**Visit our live application:** [https://pelangi-manager.replit.app/](https://pelangi-manager.replit.app/)

### 🔑 Demo Account
Use these credentials to explore the system:
- **Username:** `admin`
- **Password:** `admin123`

## 🚀 Features

### 📊 **Dashboard & Analytics**
- Real-time occupancy tracking and statistics
- Interactive occupancy calendar visualization
- Daily notifications and admin alerts
- Sortable guest tables with advanced filtering

### 🏠 **Guest Management**
- **Check-in System**: Streamlined guest registration and capsule assignment
- **Check-out System**: Efficient departure processing and capsule status updates
- **Guest Profiles**: Comprehensive guest information management
- **Guest Editing**: Update guest details and preferences

### 🧹 **Operations Management**
- **Cleaning Management**: Track cleaning schedules and capsule maintenance
- **Maintenance System**: Monitor and manage capsule repairs and upkeep
- **History Tracking**: Complete audit trail of all system activities

### ⚙️ **System Administration**
- **Settings Management**: Configure system parameters and preferences
- **User Authentication**: Secure login system with role-based access
- **Multi-language Support**: Internationalization (i18n) ready
- **Responsive Design**: Mobile-first approach for all devices

### 🔧 **Technical Features**
- **Real-time Updates**: WebSocket integration for live data synchronization
- **File Management**: Advanced file upload and storage capabilities
- **Email Integration**: Automated notifications via SendGrid
- **Google OAuth**: Secure authentication options
- **Database Management**: Robust data persistence with Drizzle ORM

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with multiple strategies
- **Real-time**: WebSocket support
- **Testing**: Jest testing framework
- **Build Tools**: Vite + ESBuild

## 📱 Responsive Design

The application is fully responsive and optimized for:
- Desktop computers
- Tablets
- Mobile devices
- Touch interfaces

## 🔒 Security Features

- Secure authentication system
- Role-based access control
- Session management
- Input validation and sanitization
- CSRF protection

## 🌍 Internationalization

Built with multi-language support ready for:
- English (default)
- Easy addition of new languages
- RTL language support capability

## 📚 Documentation

Comprehensive documentation is available in the `docs/` folder:

### 📖 **System Documentation**
- **[System Architecture Document](./docs/System_Architecture_Document.md)** - Complete system architecture and design
- **[System Requirements Specification](./docs/System_Requirements_Specification.md)** - Detailed requirements and specifications
- **[API Documentation](./docs/API_Documentation.md)** - Complete API reference and examples

### 🛠️ **Development Resources**
- **[Development Guide](./docs/Development_Guide.md)** - Setup, workflow, and best practices
- **[Storage System Guide](./docs/Storage_System_Guide.md)** - Storage architecture and configuration
- **[Troubleshooting Guide](./docs/Troubleshooting_Guide.md)** - Common issues and solutions

### 📧 **Integration Guides**
- **[Email Setup Guide](./docs/Email_Setup_Guide.md)** - SendGrid configuration and email features

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 8+
- Git for version control
- PostgreSQL (optional for development)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd PelangiManager

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser
open http://localhost:5000
```

### Default Credentials
- **Admin**: `admin` / `admin123`
- **Staff**: `Jay` / `Jay123`, `Le` / `Le123`, `Alston` / `Alston123`

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Type checking
npm run check
```

## 📦 Build & Deploy

```bash
# Build for production
npm run build

# Start production server
npm start
```

---

**Experience the future of capsule hotel management with PelangiManager!** 🏨✨

## 🤝 Contributing

We welcome contributions! Please read our development guide and follow the established coding standards. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.