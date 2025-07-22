# VIDA³ Streaming System - Production Deployment Guide

## 🚀 Overview

This guide covers the complete production deployment and operation of the VIDA³ streaming system, including setup, monitoring, scaling, and maintenance.

## 📋 Table of Contents

1. [System Architecture](#system-architecture)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Deployment](#deployment)
5. [Monitoring & Observability](#monitoring--observability)
6. [Scaling](#scaling)
7. [Security](#security)
8. [Backup & Recovery](#backup--recovery)
9. [Troubleshooting](#troubleshooting)
10. [Performance Optimization](#performance-optimization)

## 🏗️ System Architecture

### Components

- **Frontend**: React + Vite application with streaming UI
- **Backend**: Node.js + Express server with WebSocket support
- **Streaming Engine**: WebRTC-to-RTMP bridge with FFmpeg
- **Database**: PostgreSQL for user data and stream metadata
- **Cache**: Redis for session storage and rate limiting
- **Monitoring**: Prometheus + Grafana + ELK Stack
- **Reverse Proxy**: Nginx for load balancing and SSL termination

### Data Flow

```
User Browser → Nginx → VIDA³ App → WebSocket → FFmpeg → RTMP Server
     ↓              ↓           ↓           ↓         ↓
   React UI    Load Balancer  Express   Streaming  X.com/Twitch
                                    Engine
```

## 🔧 Prerequisites

### System Requirements

- **CPU**: 4+ cores (8+ recommended for production)
- **RAM**: 8GB minimum (16GB+ recommended)
- **Storage**: 100GB+ SSD storage
- **Network**: 100Mbps+ upload bandwidth
- **OS**: Linux (Ubuntu 20.04+ recommended)

### Software Requirements

- Docker & Docker Compose
- Node.js 18+
- FFmpeg 5.0+
- PostgreSQL 15+
- Redis 7+

## 🌍 Environment Setup

### 1. Environment Variables

Create a `.env` file with the following variables:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/vida_db
POSTGRES_USER=vida_user
POSTGRES_PASSWORD=secure_password

# Session & Security
SESSION_SECRET=your-super-secure-session-secret
NODE_ENV=production

# API Keys (Optional)
HUGGINGFACE_API_KEY=your-huggingface-key
OPENAI_API_KEY=your-openai-key
MESHY_API_KEY=your-meshy-key
STRIPE_SECRET_KEY=your-stripe-key
PINATA_API_KEY=your-pinata-key
PINATA_SECRET_KEY=your-pinata-secret

# Monitoring
GRAFANA_PASSWORD=secure-grafana-password
```

### 2. SSL Certificate Setup

For production, obtain SSL certificates:

```bash
# Using Let's Encrypt
sudo certbot certonly --standalone -d your-domain.com
```

## 🚀 Deployment

### 1. Quick Start with Docker Compose

```bash
# Clone the repository
git clone https://github.com/your-org/vida-streaming.git
cd vida-streaming

# Copy environment file
cp .env.example .env
# Edit .env with your values

# Start all services
docker-compose -f deployment/docker-compose.yml up -d

# Check status
docker-compose -f deployment/docker-compose.yml ps
```

### 2. Manual Deployment

```bash
# Install dependencies
npm ci --only=production

# Build the application
npm run build

# Start the server
npm start
```

### 3. Production Deployment Checklist

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database migrations run
- [ ] Monitoring services started
- [ ] Backup system configured
- [ ] Security rules applied
- [ ] Load testing completed
- [ ] Documentation updated

## 📊 Monitoring & Observability

### 1. Health Checks

The system provides health check endpoints:

```bash
# Application health
curl http://localhost:5000/health

# Database health
curl http://localhost:5000/health/db

# Streaming health
curl http://localhost:5000/health/streaming
```

### 2. Metrics Dashboard

Access monitoring dashboards:

- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Kibana**: http://localhost:5601

### 3. Key Metrics to Monitor

- **Performance**: FPS, latency, memory usage
- **Streaming**: Active streams, dropped frames, error rate
- **System**: CPU, memory, network, disk usage
- **Security**: Failed auth attempts, blocked IPs, threats

### 4. Alerting

Configure alerts for:

- High memory usage (>80%)
- Low FPS (<20)
- High error rate (>5%)
- Too many active streams (>50)
- Security threats detected

## 📈 Scaling

### 1. Horizontal Scaling

```bash
# Scale the application
docker-compose -f deployment/docker-compose.yml up -d --scale vida-app=3

# Scale with load balancer
docker-compose -f deployment/docker-compose.yml up -d nginx
```

### 2. Database Scaling

```bash
# Add read replicas
docker-compose -f deployment/docker-compose.yml up -d postgres-replica

# Configure connection pooling
# Update DATABASE_URL to use connection pooler
```

### 3. Redis Clustering

```bash
# Set up Redis cluster
docker-compose -f deployment/redis-cluster.yml up -d
```

### 4. Auto-scaling Rules

Configure auto-scaling based on:

- CPU usage > 70%
- Memory usage > 80%
- Active streams > 40
- Response time > 500ms

## 🔒 Security

### 1. Network Security

```bash
# Configure firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 2. Application Security

- JWT token validation
- Rate limiting (10 req/min per user)
- Input sanitization
- SQL injection prevention
- XSS protection

### 3. Streaming Security

- RTMP URL validation
- Stream key protection
- Frame size limits (10MB max)
- Suspicious content detection
- IP blocking capabilities

### 4. Security Monitoring

Monitor for:

- Failed authentication attempts
- Suspicious user agents
- Large frame uploads
- Rate limit violations
- Blocked IP addresses

## 💾 Backup & Recovery

### 1. Database Backup

```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR="/backup/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker exec vida-postgres pg_dump -U vida_user vida_db > $BACKUP_DIR/database.sql

# Backup configuration
cp .env $BACKUP_DIR/
cp deployment/docker-compose.yml $BACKUP_DIR/

# Compress backup
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR
rm -rf $BACKUP_DIR
```

### 2. Recovery Procedures

```bash
# Database recovery
docker exec -i vida-postgres psql -U vida_user vida_db < backup/database.sql

# Application recovery
docker-compose -f deployment/docker-compose.yml down
docker-compose -f deployment/docker-compose.yml up -d
```

### 3. Disaster Recovery Plan

1. **RTO (Recovery Time Objective)**: 15 minutes
2. **RPO (Recovery Point Objective)**: 5 minutes
3. **Backup retention**: 30 days
4. **Testing frequency**: Monthly

## 🔧 Troubleshooting

### Common Issues

#### 1. Stream Not Starting

```bash
# Check FFmpeg installation
docker exec vida-streaming-app ffmpeg -version

# Check WebSocket connection
curl -I http://localhost:5000/rtmp-relay

# Check logs
docker logs vida-streaming-app
```

#### 2. High Memory Usage

```bash
# Check memory usage
docker stats vida-streaming-app

# Restart with memory limits
docker-compose -f deployment/docker-compose.yml up -d --scale vida-app=1
```

#### 3. Database Connection Issues

```bash
# Check database health
docker exec vida-postgres pg_isready -U vida_user

# Check connection pool
docker logs vida-postgres
```

### Log Analysis

```bash
# View application logs
docker logs -f vida-streaming-app

# View nginx logs
docker logs -f vida-nginx

# Search for errors
docker logs vida-streaming-app | grep ERROR
```

## ⚡ Performance Optimization

### 1. Application Optimization

- Enable gzip compression
- Use CDN for static assets
- Implement caching strategies
- Optimize database queries
- Use connection pooling

### 2. Streaming Optimization

- Batch frame processing
- WebP compression
- Adaptive bitrate
- Frame dropping for performance
- Memory pooling

### 3. System Optimization

```bash
# Optimize kernel parameters
echo 'net.core.rmem_max = 16777216' >> /etc/sysctl.conf
echo 'net.core.wmem_max = 16777216' >> /etc/sysctl.conf
sysctl -p

# Optimize disk I/O
echo 'vm.swappiness = 10' >> /etc/sysctl.conf
```

## 📚 Additional Resources

- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [WebRTC Specification](https://webrtc.github.io/spec/)
- [RTMP Protocol](https://en.wikipedia.org/wiki/Real-Time_Messaging_Protocol)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Node.js Production Best Practices](https://expressjs.com/en/advanced/best-practices-production.html)

## 🆘 Support

For production support:

1. Check the troubleshooting section
2. Review system logs
3. Monitor metrics dashboard
4. Contact the development team
5. Create an issue on GitHub

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Maintainer**: VIDA³ Development Team 