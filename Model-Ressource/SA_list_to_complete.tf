###########################################################################################################
#                                                                                                         
# One sample of storage account parameters is provided in the map below. 
# Add more storage accounts as needed by copying the sample and modifying the values accordingly
# Replace values with the correct one as needed
# Put an empty list if no container is required
# Put an emput list if no file share is required
# Put an empty list if no role assignment is required
#                                                                                                         
###########################################################################################################



locals {
  # Allowed values for environment : p (production), u (preprod), q (qualification), h (homologation)
  env = "q"
  # Name of the service (used for the name of the storage account) - max character = 10
  service_fullname = "tfmodel"
  # Name of the resource group for the storage account
  SA_rg = "rg-tfmodel-qual-001"
  
  tags_always = {
  # Change for the email of the terraform builder
  Builder = "prenom.nom@company.com"

  # Allowed values : production, preproduction, qualification, sandbox, homologation
  Environment = "qualification"

  # Allowed values : manual, terraform/<directory name hosting the TF files>
  Deployment = "terraform/00-Model-Resources/Storage_Account_GPv2-PE"
  }

  tags_service = {
  # Change for the ROS email of this service
  ROS = "prenom.nom@fidal.com"

  # Change for the name of the service
  Service_Name = "Example service"

  # Change for the ID of the service (SIxxxxx or SAxxxxx)
  Service_ID = "SI00000"
}

  SA_list = [
    {
      # Storage account 1 - modify the name with the correct index value
      name                            = format("%s%02d", module.naming_SA.result, "1")
      # Standard or Premium
      account_tier                    = "Standard"
      # LRS, GRS, RAGRS, ZRS
      account_replication_type        = "LRS"
      # Hot, Cool or Cold (apply only for blob storage)
      access_tier                     = "Hot"
      # Allow or disallow nested items to be public (true or false)
      allow_nested_items_to_be_public = "false"
      # Allow or disallow public network access (true or false)
      public_network_access_enabled   = "true"
      # Is Hierarchical Namespace enabled (true or false)
      is_hns_enabled                  = "false"
      # Is NFSv3 enabled (true or false)
      nfsv3_enabled                   = "false"
      # Is SFTP enabled (true or false) - if true hns should also be set to true
      sftp_enabled                    = "false"

      # tags
      tags = merge(local.tags_always, local.tags_service,
        {
          # Allowed values : 
          # nobackup,
          # baas_copper_hno1, baass_copper_ho1, 
          # baas_bronze_hno1, baas_bronze_ho1,
          # baas_silver_hno1, baas_silver_ho1,
          # baas_gold_hno1, baas_gold_ho1
          Backup = "nobackup"

          Description = "Template TF for Storage account"
        }
      )
      # Network rules
      # Allowed public IP addresses
      ACL_ip_rules       = ["127.0.0.1"]
      # Allowed services to bypass the network: AzureServices, Logging, Metrics
      ACL_bypass         = ["AzureServices", "Metrics"]
      # Default action for network rules: Allow or Deny
      ACL_default_action = "Deny"
      # Subnets allowed to access the storage account
      ACL_subnets = [
        # jumpbox subnet (mandatory)
        {
          name                 = "snet-prod-westeurope-jumpbox-001"
          virtual_network_name = "vnet-prod-westeurope-jumpbox-001"
          resource_group_name  = "rg-network-prod-001"
        }
        # backup subnet (mandatory)
        {
          name                 = "snet-prod-westeurope-backup-001"
          virtual_network_name = "vnet-prod-westeurope-backup-001"
          resource_group_name  = "rg-network-prod-001"
        }
      ]
      # Identity of storage account
      identity = "None" # possibles values "SystemAssigned" or "UserAssigned" or "None"
      # List of user-assigned managed identity that we want to assign to the storage account. Only if identity = "UserAssigned"
      user_assigned_identities   	= [
        {
          name					 = "id-qual-st-cmk-01"
          resource_group = "rg-tfmodel-qual-001"
        }
      ]
      # keyvault cmk key encryption
      kv_cmk = {
          kv_name     = "kv-fidal-qual-cmk-01"
          kv_rg       = "rg-tfmodel-qual-001"
          kv_key_name = "stqtfmodel01-cmk-01"
      }
      # List of containers to create
      Containers = [
        # comment out the container below if not needed
        {
          # Choose a name for the container
          name        = "container1"
          # Allowed values : private, blob, container for anonymous access level
          # default value is private, if you want to allow anonymous access to blob or container, change the value accordingly
          access_type = "private"

          # role assignments at the container level
          role_assignments = [
            # comment out the role assignment below if not needed
            # Allowed values for role are :
            # "Storage Blob Data Contributor", "Storage Blob Data Reader" or "Storage Blob Data Owner"
            {
              group_name = "GRPC_AZURE_TFMODEL1", role = "Storage Blob Data Reader"
            }
            # add more container role assignments below if necessary with comma separation
          ]

          # lifecycle management at the container
          lcm_rules = [
            # comment out the lcm rules below if not needed
            {
              # name of rule
              name = "ruletest1"
              #The prefix specifies which blobs must be filtered on the container to apply the policy. 
              #If applying to the entire container, it must be empty: prefix = [] 
              prefix = ["folder1", "folder2"]
              #blob_type are the types of blob objects we want to process.  
              #Possibles values : ["blockBlob"] or ["appendBlob"] or ["blockBlob","appendBlob"]
              blob_types = ["blockBlob"]
              politique = {
                # Delete blob created greater than x days ago
                delete_created = 7
                # Delete blob modified greater than x days ago
                delete_modified = null
                # Move blob created greater than x days ago to the cool tier
                move_to_cool_created  = null
                # Move blob modified greater than x days ago to the cool tier
                move_to_cool_modified = null
                # Move blob created greater than x days ago to the cold tier
                move_to_cold_created  = null
                # Move blob modified greater than x days ago to the cold tier
                move_to_cold_modified = null
                # Move blob created greater than x days ago to the archive tier
                move_to_archive_created = null
                # Move blob modified greater than x days ago to the archive tier
                move_to_archive_modified = null
                # Delete snapshot since created greater than x days ago
                snapshop_delete = null
                # Delete version since created greater than x days ago
                version_delete = null
              }
            }
            # # add more lcm rules below if necessary with comma separation
          ]
          # Police Immuable pour la protection des données de type blob en modification ou suppression
          immutability_policy = {
            # true = creation de la police time based / false = pas de creation de polce time based
            time_based_enabled = false
            # intervalle de temps en jour(s) pendant lequel les données doivent être conservées dans un état non effaçable et non modifiable
            time_based_retention_days = 1
            # time_based_locked : verrouillage ou non de la police time based
            # true = police time based avec statut vérouillé (Locked) / false = police time based avec status dévérouillé (UnLocked)
            # statut vérouillé(Locked) : plus possible de supprimer la police. Possibilité de mettre à jour uniquement time_based_retention_days avec une valeur supérieure à celle existante
            # statut dévérouillé(UnLocked) : possibilité de supprimer la police à tout moment et également de modifier tous les champs de la police
            time_based_locked  = false
            #time_based_protected_append_writes : autorise en exception l'ajout écriture à la fin de l'objet block ou de l'append blobs
            # Possibles valeurs:
            # none : Aucune exception d'ajout en écriture pour les blocks et append blobs
            # append : Exception uniquement pour objets de type append blobs
            # all : Exception pour les objets de type block et append blobs
            time_based_protected_append_writes = "none" # none | append | all
          }
        }
        # add more containers below if necessary wih comma separation
      ]
      azure_file_shares = [
        # comment out the file shares below if not needed
        { 
          # Choose a name for the file share
          name = "fileshare1"

          # Choose a quota for the file share in Gigabytes
          # standard storage account is between 1 and 5 TiB
          # premium storage account is between 100 GiB and 100 TiB
          quota = 1

          # Allowed values : Hot, Cool, TransactionOptimized, Premium
          access_tier = "Hot"

          # Allowed values : SMB or NFS
          enabled_protocol = "SMB"

          # Role assignment at the file share level
          role_assignments = [
          # comment out the role assignment below if not needed
          # Allowed values for role are :
          # "Storage File Data SMB Share Reader", "Storage File Data SMB Share Contributor" or "Storage File Data SMB Share Elevated Contributor"
           { group_name = "GRPC_AZURE_TFMODEL1", role = "Storage File Data SMB Share Contributor" },
           { group_name = "GRPC_AZURE_TFMODEL1", role = "Storage File Data SMB Share Reader" }
          ] 

        }
      ]
      # Role assignment at the storage account level
      account_role_assignments = [
        # comment out the role assignment below if not needed
        {
          group_name = "GRPC_AZURE_TFMODEL1", role = "Storage Account Contributor"
        }
        # add more storage account role assignments below if necessary with comma separation
      ]
      # Lifecycle management at the storage account level. rules to be applied to all containers
      account_lcm_rules = [
            # # comment out the lcm rules below if not needed
            {
              # name of rule
              name = "deleteMoreThan24h"
              # blob_type are the types of blob objects we want to process.  
              # Possibles values : ["blockBlob"] or ["appendBlob"] or ["blockBlob","appendBlob"]
              blob_types = ["blockBlob","appendBlob"]
              politique = {
                # Delete blob created greater than x days ago
                delete_created = null
                # Delete blob modified greater than x days ago
                delete_modified = 1
                # Move blob created greater than x days ago to the cool tier
                move_to_cool_created  = null
                # Move blob modified greater than x days ago to the cool tier
                move_to_cool_modified = null
                # Move blob created greater than x days ago to the cold tier
                move_to_cold_created  = null
                # Move blob modified greater than x days ago to the cold tier
                move_to_cold_modified = null
                # Move blob created greater than x days ago to the archive tier
                move_to_archive_created = null
                # Move blob modified greater than x days ago to the archive tier
                move_to_archive_modified = null
                # Delete snapshot since created greater than x days ago
                snapshop_delete = null
                # Delete version since created greater than x days ago
                version_delete = null
              }
            }
      ]
      # private endpoint for Azure File share
      AFS_private_endpoint = {
        # Allows you to determine whether to create a private endpoint for the storage account. true, it will be created. false, it will not be created
        pe_create = false
        # Name of the subnet in which the private endpoint will be configured
        pe_subnet_name         = "snet-qual-westeurope-tfmodel1-001"
        #Name of the network in which the subnet is located
        pe_vnet_name           = "vnet-qual-westeurope-tfmodel-001"
        #Name of the rg in which the vnet is located
        pe_vnet_rg             = "rg-network-qual-001"
        # Name of the ASG to assign to the private endpoint
        pe_asg_name            = "asg-qual-app001-tfmodelweb-eth0"
        # Name of the asg rg
        pe_asg_rg              = "rg-network-qual-001"
        # Static IP address of the private endpoint
        pe_ip_address          = "172.18.13.6"
      }
      # private endpoint for Azure Blob
      BLOB_private_endpoint = {
        # true = création du PE blob / false = pas de PE blob
        pe_create      = false
        # Subnet du private endpoint
        pe_subnet_name = "snet-qual-westeurope-tfmodel1-001"
        pe_vnet_name   = "vnet-qual-westeurope-tfmodel-001"
        pe_vnet_rg     = "rg-network-qual-001"
        # Name of the ASG to assign to the private endpoint
        pe_asg_name    = "asg-qual-app001-tfmodelweb-eth0"
        # Name of the asg rg
        pe_asg_rg      = "rg-network-qual-001"
        # Static IP address of the private endpoint
        pe_ip_address  = "172.18.13.7"
      }
    }
    # add more storage accounts below if necessary with comma separation
    
    ,{
      # Storage account 1 - modify the name with the correct index value
      name                            = format("%s%02d", module.naming_SA.result, "2")
      # Standard or Premium
      account_tier                    = "Standard"
      # LRS, GRS, RAGRS, ZRS
      account_replication_type        = "LRS"
      # Hot, Cool or Cold (apply only for blob storage)
      access_tier                     = "Hot"
      # Allow or disallow nested items to be public (true or false)
      allow_nested_items_to_be_public = "false"
      # Allow or disallow public network access (true or false)
      public_network_access_enabled   = "true"
      # Is Hierarchical Namespace enabled (true or false)
      is_hns_enabled                  = "false"
      # Is NFSv3 enabled (true or false)
      nfsv3_enabled                   = "false"
      # Is SFTP enabled (true or false) - if true hns should also be set to true
      sftp_enabled                    = "false"

      # tags
      tags = merge(local.tags_always, local.tags_service,
        {
          # Allowed values : 
          # nobackup,
          # baas_copper_hno1, baass_copper_ho1, 
          # baas_bronze_hno1, baas_bronze_ho1,
          # baas_silver_hno1, baas_silver_ho1,
          # baas_gold_hno1, baas_gold_ho1
          Backup = "nobackup"

          Description = "Template TF for Storage account"
        }
      )
      # Network rules
      # Allowed public IP addresses
      ACL_ip_rules       = ["127.0.0.1"]
      # Allowed services to bypass the network: AzureServices, Logging, Metrics
      ACL_bypass         = ["AzureServices", "Metrics"]
      # Default action for network rules: Allow or Deny
      ACL_default_action = "Deny"
      # Subnets allowed to access the storage account
      ACL_subnets = [
        jumpbox subnet (mandatory)
        {
         name                 = "snet-prod-westeurope-jumpbox-001"
         virtual_network_name = "vnet-prod-westeurope-jumpbox-001"
         resource_group_name  = "rg-network-prod-001"
       }
        backup subnet (mandatory)
       ,
       {
          name                 = "snet-prod-westeurope-backup-001"
          virtual_network_name = "vnet-prod-westeurope-backup-001"
          resource_group_name  = "rg-network-prod-001"
       }
      ]
      # Identity of storage account
      # possibles values : "SystemAssigned" or "UserAssigned" or "None"
      identity = "None"
      # List of user-assigned managed identity that we want to assign to the storage account. 
      # Only if identity = "UserAssigned"
      user_assigned_identities   	= [
        {
          name					 = "id-qual-st-cmk-01"
          resource_group = "rg-tfmodel-qual-001"
        }
      ]
      # keyvault cmk key encryption
      kv_cmk = {
        kv_name     = "kv-fidal-qual-cmk-01"
        kv_rg       = "rg-tfmodel-qual-001"
        kv_key_name = "stqtfmodel01-cmk-01"
      }
      # List of containers to create
      Containers = [
        # comment out the container below if not needed
        {
          # Choose a name for the container
          name        = "container1"
          # Allowed values : private, blob, container for anonymous access levelT
          access_type = "private"

          # role assignments at the container level
          role_assignments = [
            # comment out the role assignment below if not needed
            # Allowed values for role are :
            # "Storage Blob Data Contributor", "Storage Blob Data Reader" or "Storage Blob Data Owner"
            {
              group_name = "GRPC_AZURE_TFMODEL1", role = "Storage Blob Data Reader"
            }
            # add more container role assignments below if necessary with comma separation
          ]

          # lifecycle management at the container
          lcm_rules = [
            # comment out the lcm rules below if not needed
            {
              # name of rule
              name = "ruletest1"
              #The prefix specifies which blobs must be filtered on the container to apply the policy. 
              #If applying to the entire container, it must be empty: prefix = [] 
              prefix = ["folder1", "folder2"]
              #blob_type are the types of blob objects we want to process.  
              #Possibles values : ["blockBlob"] or ["appendBlob"] or ["blockBlob","appendBlob"]
              blob_types = ["blockBlob"]
              politique = {
                # Delete blob created greater than x days ago
                delete_created = 7
                # Delete blob modified greater than x days ago
                delete_modified = null
                # Move blob created greater than x days ago to the cool tier
                move_to_cool_created  = null
                # Move blob modified greater than x days ago to the cool tier
                move_to_cool_modified = null
                # Move blob created greater than x days ago to the cold tier
                move_to_cold_created  = null
                # Move blob modified greater than x days ago to the cold tier
                move_to_cold_modified = null
                # Move blob created greater than x days ago to the archive tier
                move_to_archive_created = null
                # Move blob modified greater than x days ago to the archive tier
                move_to_archive_modified = null
                # Delete snapshot since created greater than x days ago
                snapshop_delete = null
                # Delete version since created greater than x days ago
                version_delete = null
              }
            }
            # # add more lcm rules below if necessary with comma separation
          ]
          # Police Immuable pour la protection des données de type blob en modification ou suppression
          immutability_policy = {
          # true = creation de la police time based / false = pas de creation de polce time based
          time_based_enabled = false
          # intervalle de temps en jour(s) pendant lequel les données doivent être conservées dans un état non effaçable et non modifiable
          time_based_retention_days = 1
          # time_based_locked : verrouillage ou non de la police time based
          # true = police time based avec statut vérouillé(Locked) / false = police time based avec statut dévérouillé(UnLocked)
          # statut vérouillé(Locked) : plus possible de supprimer la police. Possibilité de mettre à jour uniquement time_based_retention_days avec une valeur supérieure à celle existante
          # statut dévérouillé(UnLocked) : possibilité de supprimer la police à tout moment et là mettre à jour
          time_based_locked  = false
          # time_based_protected_append_writes : autorise en exception l'ajout écriture à la fin de l'objet block ou de l'append blobs
          # Possibles valeurs:
          # none : Aucune exception d'ajout en écriture pour les blocks et append blobs
          # append : Exception uniquement pour objets de type append blobs
          # all : Exception pour les objets de type block et append blobs
          time_based_protected_append_writes = "none" # none | append | all
          }
        }
        # # add more containers below if necessary wih comma separation
      ]
      azure_file_shares = [
        # comment out the file shares below if not needed
        { 
          # Choose a name for the file share
          name = "fileshare1"

          # Choose a quota for the file share in Goigabytes
          # standard storage account is between 1 and 5 TiB
          # premium storage account is between 100 GiB and 100 TiB
          quota = 1

          # Allowed values : Hot, Cool, TransactionOptimized, Premium
          access_tier = "Hot"

          # Allowed values : SMB or NFS
          enabled_protocol = "SMB"

          # Role assignment at the file share level
          role_assignments = [
          # comment out the role assignment below if not needed
          # Allowed values for role are :
          # "Storage File Data SMB Share Reader", "Storage File Data SMB Share Contributor" or "Storage File Data SMB Share Elevated Contributor"
           { group_name = "GRPC_AZURE_TFMODEL1", role = "Storage File Data SMB Share Contributor" },
           { group_name = "GRPC_AZURE_TFMODEL1", role = "Storage File Data SMB Share Reader" }
          ] 

        }
      ]
      # Role assignment at the storage account level
      account_role_assignments = [
        # comment out the role assignment below if not needed
        {
          group_name = "GRPC_AZURE_TFMODEL1", role = "Storage Account Contributor"
        }
        # add more storage account role assignments below if necessary with comma separation
      ]
      # Lifecycle management at the storage account level. rules to be applied to all containers
      account_lcm_rules = [
            # # comment out the lcm rules below if not needed
            {
              # name of rule
              name = "deleteMoreThan24h"
              # blob_type are the types of blob objects we want to process.  
              # Possibles values : ["blockBlob"] or ["appendBlob"] or ["blockBlob","appendBlob"]
              blob_types = ["blockBlob","appendBlob"]
              politique = {
                # Delete blob created greater than x days ago
                delete_created = null
                # Delete blob modified greater than x days ago
                delete_modified = 1
                # Move blob created greater than x days ago to the cool tier
                move_to_cool_created  = null
                # Move blob modified greater than x days ago to the cool tier
                move_to_cool_modified = null
                # Move blob created greater than x days ago to the cold tier
                move_to_cold_created  = null
                # Move blob modified greater than x days ago to the cold tier
                move_to_cold_modified = null
                # Move blob created greater than x days ago to the archive tier
                move_to_archive_created = null
                # Move blob modified greater than x days ago to the archive tier
                move_to_archive_modified = null
                # Delete snapshot since created greater than x days ago
               snapshop_delete = null
                # Delete version since created greater than x days ago
                version_delete = null
              }
            }
      ]
     # private endpoint for Azure File share
      AFS_private_endpoint = {
        # Allows you to determine whether to create a private endpoint for the storage account. true, it will be created. false, it will not be created
        pe_create = true
        # Name of the subnet in which the private endpoint will be configured
        pe_subnet_name         = "snet-qual-westeurope-tfmodel1-001"
        #Name of the network in which the subnet is located
        pe_vnet_name           = "vnet-qual-westeurope-tfmodel-001"
        #Name of the rg in which the vnet is located
        pe_vnet_rg             = "rg-network-qual-001"
        # Name of the ASG to assign to the private endpoint
        pe_asg_name            = "asg-qual-app001-tfmodelweb-eth0"
        # Name of the asg rg
        pe_asg_rg              = "rg-network-qual-001"
        # Static IP address of the private endpoint
        pe_ip_address          = "172.18.13.8"
      }
      # private endpoint for Azure Blob
      BLOB_private_endpoint = {
        # true = création du PE blob / false = pas de PE blob
        pe_create      = true
        # Subnet du private endpoint
        pe_subnet_name = "snet-qual-westeurope-tfmodel1-001"
        pe_vnet_name   = "vnet-qual-westeurope-tfmodel-001"
        pe_vnet_rg     = "rg-network-qual-001"
        # Name of the ASG to assign to the private endpoint
        pe_asg_name    = "asg-qual-app001-tfmodelweb-eth0"
        # Name of the asg rg
        pe_asg_rg      = "rg-network-qual-001"
        # Static IP address of the private endpoint
        pe_ip_address  = "172.18.13.9"
      }

    }
  ]
}