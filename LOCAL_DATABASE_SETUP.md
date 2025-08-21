# 🗄️ Local PostgreSQL Database Setup

## 🚀 **One-Command Setup (Recommended)**

### **For Windows Users:**
```bash
# Double-click this file or run in Command Prompt:
setup-local-db.bat

# Or run in PowerShell:
.\setup-local-db.ps1
```

### **For Mac/Linux Users:**
```bash
# Run this command:
docker-compose up -d postgres && sleep 15 && npm run db:init
```

---

## 📋 **What the Script Does Automatically:**

1. ✅ **Checks if Docker is installed**
2. ✅ **Starts PostgreSQL database**
3. ✅ **Waits for database to be ready**
4. ✅ **Creates all required tables**
5. ✅ **Sets up pgAdmin web interface**

---

## 🔧 **Manual Setup (if scripts don't work):**

### **Step 1: Install Docker Desktop**
- Download from [docker.com](https://docker.com)
- Install and restart your computer
- Make sure Docker is running (green icon in system tray)

### **Step 2: Run Setup**
```bash
# Start database
docker-compose up -d postgres

# Wait for it to start (about 15 seconds)
# Then create tables
npm run db:init
```

---

## 🌐 **Access Your Database:**

### **pgAdmin (Web Interface):**
- **URL:** http://localhost:8080
- **Email:** admin@pelangi.com
- **Password:** admin123

### **Database Connection:**
- **Host:** localhost
- **Port:** 5432
- **Database:** pelangi_manager
- **Username:** pelangi_user
- **Password:** pelangi_password

---

## 🚀 **Start Your App:**

```bash
npm run dev
```

Your app will now use the local PostgreSQL database instead of the cloud database!

---

## 🛠️ **Troubleshooting:**

### **Port 5432 already in use:**
```bash
# Stop any existing PostgreSQL services
docker-compose down
# Then run setup again
```

### **Docker not found:**
- Install Docker Desktop from [docker.com](https://docker.com)
- Restart your computer after installation

### **Permission denied:**
- Run PowerShell as Administrator
- Or use the .bat file instead

---

## 🎯 **What You Get:**

- ✅ **Fast local development** (no internet needed)
- ✅ **Full database control** (easy to reset/clean)
- ✅ **pgAdmin interface** (visual database management)
- ✅ **Persistent data** (survives computer restarts)
- ✅ **Easy cleanup** (just run `docker-compose down`)

---

**🎉 That's it! Just run the setup script and you're ready to go!**
