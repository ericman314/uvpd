-- MySQL dump 10.13  Distrib 5.5.47, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: pinewood
-- ------------------------------------------------------
-- Server version	5.5.47-0ubuntu0.14.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `Achievements`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Achievements` (
  `carId` int(11) NOT NULL,
  `achievement` text NOT NULL,
  `eventId` int(11) NOT NULL,
  `achHash` varchar(32) NOT NULL,
  PRIMARY KEY (`carId`,`achHash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `BestTimes`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `BestTimes` (
  `EventId` varchar(24) DEFAULT NULL,
  `CarId` varchar(24) DEFAULT NULL,
  `EventName` text,
  `Name` text,
  `BestTime` decimal(7,6) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Cars`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Cars` (
  `carId` int(11) NOT NULL AUTO_INCREMENT,
  `eventId` int(11) NOT NULL,
  `carName` text NOT NULL,
  `weight` decimal(9,6) DEFAULT NULL,
  `den` text,
  `nickname` text,
  `deferPerm` tinyint(4) NOT NULL DEFAULT '0',
  `imageVersion` bigint(20) NOT NULL DEFAULT '0',
  PRIMARY KEY (`carId`)
) ENGINE=InnoDB AUTO_INCREMENT=3251 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CheckIn`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `CheckIn` (
  `checkInId` varchar(36) NOT NULL,
  `carName` tinytext NOT NULL,
  `den` tinytext,
  `nickname` tinytext,
  `time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `addedToEventId` int(11) DEFAULT NULL,
  `checkInEventId` int(11) DEFAULT NULL,
  PRIMARY KEY (`checkInId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Events`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Events` (
  `eventId` int(11) NOT NULL AUTO_INCREMENT,
  `eventName` text NOT NULL,
  `eventDate` datetime NOT NULL,
  `multiplier` int(11) NOT NULL,
  `code` text,
  `shortUrl` text,
  `longUrl` text,
  `enableVoting` bit(1) NOT NULL DEFAULT b'0',
  `hidden` bit(1) NOT NULL DEFAULT b'0',
  PRIMARY KEY (`eventId`)
) ENGINE=InnoDB AUTO_INCREMENT=206 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Results`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Results` (
  `resultId` int(11) NOT NULL AUTO_INCREMENT,
  `carId` int(11) NOT NULL,
  `lane` tinyint(4) NOT NULL,
  `time` decimal(9,6) NOT NULL,
  `resultDate` datetime NOT NULL,
  `place` tinyint(4) DEFAULT NULL,
  `eventId` int(11) NOT NULL,
  PRIMARY KEY (`resultId`)
) ENGINE=InnoDB AUTO_INCREMENT=13973 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ResultsFromMongo`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ResultsFromMongo` (
  `EventId` varchar(24) DEFAULT NULL,
  `ResultId` varchar(24) DEFAULT NULL,
  `CarId` varchar(24) DEFAULT NULL,
  `EventName` text,
  `Name` text,
  `Lane` int(11) DEFAULT NULL,
  `Time` decimal(7,6) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Users`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Users` (
  `userId` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `password` text NOT NULL,
  `admin` tinyint(4) DEFAULT '0',
  `eventIds` text,
  PRIMARY KEY (`userId`),
  UNIQUE KEY `Users_UN` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Votes`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Votes` (
  `CarId` int(11) NOT NULL,
  `Votes` int(11) NOT NULL,
  PRIMARY KEY (`CarId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-03 20:38:00
