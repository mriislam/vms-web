@REM ----------------------------------------------------------------------------
@REM Licensed to the Apache Software Foundation (ASF) under one
@REM or more contributor license agreements.  See the NOTICE file
@REM distributed with this work for additional information
@REM regarding copyright ownership.  The ASF licenses this file
@REM to you under the Apache License, Version 2.0 (the
@REM "License"); you may not use this file except in compliance
@REM with the License.  You may obtain a copy of the License at
@REM
@REM    https://www.apache.org/licenses/LICENSE-2.0
@REM
@REM Unless required by applicable law or agreed to in writing,
@REM software distributed under the License is distributed on an
@REM "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
@REM KIND, either express or implied.  See the License for the
@REM specific language governing permissions and limitations
@REM under the License.
@REM ----------------------------------------------------------------------------

@REM Apache Maven Wrapper startup batch script, version 3.3.2

@IF "%MAVEN_BATCH_ECHO%"=="on"  ECHO %MAVEN_BATCH_ECHO%

@REM Set env vars before we step into the config
@SETLOCAL

@REM ==== START VALIDATION ====
IF NOT "%JAVA_HOME%"=="" GOTO OkJHome

FOR %%i IN (java.exe) DO SET "JAVACMD=%%~$PATH:i"
IF EXIST "%JAVACMD%" GOTO init

ECHO.
ECHO Error: JAVA_HOME not found in your environment. 1>&2
ECHO Please set the JAVA_HOME variable in your environment to match the 1>&2
ECHO location of your Java installation. 1>&2
ECHO.
GOTO error

:OkJHome
IF EXIST "%JAVA_HOME%\bin\java.exe" GOTO init

ECHO.
ECHO Error: JAVA_HOME is set to an invalid directory. 1>&2
ECHO JAVA_HOME = "%JAVA_HOME%" 1>&2
ECHO Please set the JAVA_HOME variable in your environment to match the 1>&2
ECHO location of your Java installation. 1>&2
ECHO.
GOTO error

:init
IF NOT "%JAVA_HOME%"=="" SET "JAVACMD=%JAVA_HOME%\bin\java.exe"

@REM Find the project base dir
SET MAVEN_PROJECTBASEDIR=%MAVEN_BASEDIR%
IF NOT "%MAVEN_PROJECTBASEDIR%"=="" GOTO endDetectBaseDir

SET "EXEC_DIR=%CD%"
SET "WDIR=%EXEC_DIR%"

:findBaseDir
IF EXIST "%WDIR%\.mvn" GOTO baseDirFound
cd ..
IF "%WDIR%"=="%CD%" GOTO baseDirNotFound
SET "WDIR=%CD%"
GOTO findBaseDir

:baseDirNotFound
SET "MAVEN_PROJECTBASEDIR=%EXEC_DIR%"
GOTO endDetectBaseDir

:baseDirFound
SET "MAVEN_PROJECTBASEDIR=%WDIR%"

:endDetectBaseDir
cd "%EXEC_DIR%"

@REM Fetch the wrapper jar
SET WRAPPER_JAR="%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar"
SET WRAPPER_PROPERTIES="%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.properties"
SET WRAPPER_URL_PROPERTY=wrapperUrl

FOR /F "usebackq tokens=1,2 delims==" %%A IN (%WRAPPER_PROPERTIES%) DO (
    IF "%%A"=="%WRAPPER_URL_PROPERTY%" SET WRAPPER_URL=%%B
)

IF EXIST %WRAPPER_JAR% GOTO runWithWrapperJar

FOR /F "usebackq tokens=1,* delims==" %%A IN (%WRAPPER_PROPERTIES%) DO (
    IF "%%A"=="distributionUrl" SET DISTRIBUTION_URL=%%B
)

@REM If wrapper jar is missing, use the Maven installation directly if available
SET "MAVEN_HOME=C:\Users\Public\apache-maven-3.9.6"
IF EXIST "%MAVEN_HOME%\bin\mvn.cmd" GOTO runWithInstalledMaven

ECHO Downloading maven-wrapper.jar...
"%JAVACMD%" -classpath "" "-Dmaven.wrapper.jarUrl=%WRAPPER_URL%" "-Dmaven.wrapper.propertiesFile=%WRAPPER_PROPERTIES%" org.apache.maven.wrapper.MavenWrapperDownloader 2>NUL
IF EXIST %WRAPPER_JAR% GOTO runWithWrapperJar
GOTO runWithInstalledMaven

:runWithWrapperJar
"%JAVACMD%" %MAVEN_OPTS% %MAVEN_BATCH_OPTS% ^
  -classpath %WRAPPER_JAR% ^
  "-Dmaven.home=%MAVEN_PROJECTBASEDIR%" ^
  "-Dmaven.multiModuleProjectDirectory=%MAVEN_PROJECTBASEDIR%" ^
  org.apache.maven.wrapper.MavenWrapperMain %* 2>nul
IF ERRORLEVEL 1 GOTO runWithInstalledMaven
GOTO end

:runWithInstalledMaven
IF NOT EXIST "%MAVEN_HOME%\bin\mvn.cmd" GOTO error
CALL "%MAVEN_HOME%\bin\mvn.cmd" %*
IF ERRORLEVEL 1 GOTO error
GOTO end

:error
SET ERROR_CODE=1

:end
@ENDLOCAL & SET ERROR_CODE=%ERROR_CODE%

IF NOT "%MAVEN_BATCH_PAUSE%"=="yes" GOTO mainEnd
PAUSE

:mainEnd
EXIT /B %ERROR_CODE%
