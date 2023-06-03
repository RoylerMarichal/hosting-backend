-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `username` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `avatar` VARCHAR(255) NULL,
    `resetCode` VARCHAR(7) NULL,
    `resetCodeExpires` DATETIME(3) NULL,
    `password` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(16) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Order` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `packageId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'PENDING', 'COMPLETED', 'DRAFT') NOT NULL DEFAULT 'PENDING',
    `data` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Service` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Package` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `price` DOUBLE NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `serviceId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdminCurrencies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(11) NOT NULL,
    `main` INTEGER NOT NULL DEFAULT 0,
    `code` VARCHAR(11) NOT NULL,
    `rate` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserAmounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `currencyId` INTEGER NOT NULL DEFAULT 1,
    `amount` DOUBLE NOT NULL DEFAULT 0,
    `amount_pending` DOUBLE NOT NULL DEFAULT 0,
    `amount_stopad` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `UserAmounts_userId_idx`(`userId`),
    INDEX `UserAmounts_currencyId_idx`(`currencyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdminMovementsAmounts` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `model` ENUM('USER', 'PRODUCT', 'SERVICE') NOT NULL DEFAULT 'USER',
    `modelId` INTEGER NOT NULL,
    `details` VARCHAR(128) NOT NULL,
    `currencyId` INTEGER NOT NULL,
    `amount` DOUBLE NOT NULL,
    `type` ENUM('DEBIT', 'CREDIT') NOT NULL DEFAULT 'CREDIT',
    `status` ENUM('ACTIVE', 'INACTIVE', 'PENDING', 'COMPLETED', 'DRAFT') NOT NULL DEFAULT 'COMPLETED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AdminMovementsAmounts_currencyId_idx`(`currencyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
