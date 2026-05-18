@echo off
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"
set "MAVEN_HOME=C:\Users\Public\apache-maven-3.9.6"
set "PATH=%MAVEN_HOME%\bin;%PATH%"
cd /d "D:\VMS\backend"
call "%MAVEN_HOME%\bin\mvn.cmd" clean package -DskipTests >> "D:\VMS\logs\backend.log" 2>&1
if errorlevel 1 (
    echo BUILD FAILURE >> "D:\VMS\logs\backend.log"
    exit /b 1
)
"%JAVA_HOME%\bin\java.exe" -jar target\vms-backend-1.0.0.jar >> "D:\VMS\logs\backend.log" 2>&1
