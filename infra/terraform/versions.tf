terraform {
  required_version = ">= 1.14.0"

  backend "azurerm" {
    resource_group_name  = "rg-nueva-era-prod"
    storage_account_name = "stnuevaeraprod2xg97h"
    container_name       = "tfstate"
    key                  = "almacen-api-prod.tfstate"
  }

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }

    random = {
      source  = "hashicorp/random"
      version = "~> 3.7"
    }
  }
}

provider "azurerm" {
  subscription_id                 = var.subscription_id
  tenant_id                       = var.tenant_id
  resource_provider_registrations = "none"

  features {}
}
