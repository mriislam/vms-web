@echo off
set JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot
set MVN=C:\Users\Public\apache-maven-3.9.6\bin\mvn.cmd
cd /d D:\VMS\backend
echo Starting VMS Backend on port 8080...
"%MVN%" spring-boot:run
pause
