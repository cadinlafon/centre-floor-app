# Centre Floor App

A modern messaging application for the Centre Floor community. Built with React and Firebase, Centre Floor App enables seamless communication, real-time messaging, and community engagement.

## 🎯 Features

- **Real-time Messaging** - Instant message delivery and notifications
- **User Authentication** - Secure Firebase authentication
- **Message History** - Browse and search past conversations
- **User Profiles** - Customize your profile and presence
- **Direct Messages** - Private one-on-one conversations
- **Community Channels** - Group messaging and discussions
- **Read Receipts** - See when messages are read
- **Typing Indicators** - Know when others are typing
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Progressive Web App** - Install as a native app

## 🛠️ Tech Stack

- **Frontend Framework**: React 19
- **Language**: JavaScript (ES6+)
- **Build Tool**: Vite
- **Styling**: Styled Components
- **Backend/Database**: Firebase (Realtime Database, Cloud Storage)
- **Authentication**: Firebase Auth
- **Routing**: React Router v7
- **PWA**: vite-plugin-pwa
- **Hosting**: Firebase Hosting

## 📦 Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Firebase account with project set up

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/cadinlafon/centre-floor-app.git
   cd centre-floor-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory with your Firebase credentials:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```
   The app will open at `http://localhost:5173`

## 🚀 Usage

### Development Commands

```bash
# Start development server with HMR
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Run ESLint
npm run lint
```

### Building for Production

```bash
npm run build
```

Output will be generated in the `dist/` directory.

### Deploying to Firebase Hosting

```bash
# Install Firebase CLI globally (if needed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy to Firebase Hosting
firebase deploy
```

## 📁 Project Structure

```
centre-floor-app/
├── src/                     # Source code
│   ├── components/          # React components
│   │   ├── Chat.jsx
│   │   ├── UserProfile.jsx
│   │   ├── MessageList.jsx
│   │   └── ...
│   ├── pages/              # Page components
│   ├── lib/                # Utilities and Firebase config
│   ├── hooks/              # Custom React hooks
│   ├── App.jsx             # Main app component
│   └── main.jsx            # Entry point
├── src-backup/             # Backup of source code
├── public/                 # Static assets
├── index.html              # HTML template
├── vite.config.js          # Vite configuration
├── firebase.json           # Firebase Hosting config
├── .firebaserc             # Firebase project settings
├── eslint.config.js        # ESLint configuration
└── package.json            # Dependencies
```

## 🔐 Authentication

Firebase Authentication provides:
- Email/password registration and login
- Google Sign-In integration
- Session persistence
- Secure token management
- User profile data

## 💾 Firebase Services

The app uses several Firebase services:

### Realtime Database
- User profiles and metadata
- Message storage
- Channel information
- Typing indicators
- Read receipt tracking

### Cloud Storage
- Profile pictures and avatars
- Message attachments
- Media sharing

### Authentication
- User registration and login
- Email verification
- Account management

## 📱 PWA Features

- **Offline Support** - Cached messages available offline
- **Install Prompt** - Add to home screen on mobile devices
- **App Icon** - Native-like appearance
- **Push Notifications** - Receive message alerts (future enhancement)

## 🎨 Styling

The app uses Styled Components for:
- Component-scoped styling
- Dynamic theming support
- Responsive design patterns
- Consistent UI/UX

## 🔄 Real-time Features

- **Live Messaging** - Instant message updates across all clients
- **Presence Detection** - See who's online/offline
- **Typing Indicators** - Real-time typing status
- **Message Timestamps** - Accurate message timing
- **User Status** - Active, away, offline indicators

## 🧪 Testing

Currently no automated tests are configured. Contributions welcome!

## 📝 Code Quality

- **Linting**: ESLint for code consistency
- **Formatting**: Vite + standard JavaScript conventions
- **Structure**: Component-based architecture

## 🚀 Performance

- **Code Splitting**: Route-based lazy loading
- **Image Optimization**: Vite asset optimization
- **Caching**: Service worker caching strategy
- **Bundle Size**: Optimized production builds

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

Proprietary - Centre Floor App. Unauthorized use prohibited.

## 🐛 Known Issues / To-Do

- [ ] Add message search functionality
- [ ] Implement message reactions
- [ ] Add voice/video call support
- [ ] Implement message pinning
- [ ] Add user blocking feature
- [ ] Implement message encryption

## 📞 Support

For issues, questions, or feature requests, please open an issue on GitHub.

## 📧 Contact

For business inquiries or support, contact the Centre Floor team.

## 🔄 Version

Current version: 0.1.0 (Beta)

---

**Repository**: https://github.com/cadinlafon/centre-floor-app
**Last Updated**: June 2026
