#######################################################################################
#
# Subscription ID
#
#######################################################################################

subid = "325177c3-fdc7-48c7-92b4-a4d8b6ca48a8"

#######################################################################################
#
# Datasources (global)
#
#######################################################################################

# name of the RG for the VMs
vm_rg         = "rg-tfmodel-qual-001"
# name of the storage account to use for the boot diagnostic of the VMs
bootdiag_name = "bdqtfmodel01"
bootdiag_rg   = "rg-tfmodel-qual-001"

# name of the ASG to associate with the VMs
asg1_name     = "asg-qual-app001-tfmodelbdd-eth0"
# name of the RG used by the source Azure Image
template_rg   = "rg-template-prod-001"

# name of the vnet/subnet which will host the VM
subnet1_name = "snet-qual-westeurope-tfmodel1-001"
vnet_name    = "vnet-qual-westeurope-tfmodel-001"

#######################################################################################
#
# Define variables for the windows VMs (global)
#
#######################################################################################

# naming convention is different for infrastructure VM and application VM
# Allow values : infrastructure or application
# vm_type = "infrastructure"
vm_type = "application"

# Environment
# Allowed values : prod, ppd, qual, sdbx, homl
env = "qual"

# Used for M2C Application VM naming
# Allow values : p (production), u (uat/preproduction), q (qualification), s (sandbox), h (homologation)
vm_env = "q"

# Full name of the application or infrastructure service
# Used to build the name the RG name (no lentgth limitation) and the NSG following Fidal naming convention
service_fullname = "tfmodel"

# Short name for the infra VM
# Used to build the name of the infrastructure VM (6 characters max) following Fidal naming convention
infra_shortname = ""

# Short name of the service (7 charachers max) + role of the VM (3 characters : web, bdd, lic, ...)
# Used to build the name of the VM if it is an application VM
# Put a value only if vm_type = "application"
app_shortname = "tfmodelbdd"

#####################################################################################
#
# TAGS (Global)
#
#####################################################################################

tags_always = {
  # Change for the email of the terraform builder
  Builder = "phou-ngan.vannaxay@fidal.com"

  # Allowed values : production, preproduction, qualification, sandbox, homologation
  Environment = "qualification"

  # Allowed values : manual, terraform/<directory name hosting the TF files>
  Deployment = "terraform/00-Model-Resources/003-WIN-IMAGE-VMROLE3"
}

tags_service = {
  # Change for the ROS email of this service
  ROS = "phou-ngan.vannaxay@fidal.com"

  # Change for the name of the service
  Service_Name = "TF Model"

  # Change for the ID of the service (SIxxxxx or SAxxxxx)
  Service_ID = "SI00000"

}

# tags_asg_eth0 = {
#   # free-form text
#   Description = "none"
# }

#######################################################################################
#
# Define variables for the windows VM1
#
#######################################################################################

# Specify the name of the Azure Image to create the VM
vm1_image_name = "Windows-2019-datacenter-17763.3406.220909"

# Start the indexing of the VM at the value below (used for the VM name)
vm1_index = "1"

# Define which static IP address to allocate to the VM within the IP subnet
# The first 3 IP addresses of an IP subnet are always reserved by Microsoft
vm1_hostnum = "6"

# Define the family and size of the VM(s)
vm1_size = "Standard_D2s_v5"

# Define in which avaibility zone (AZ) the first VM should be created : 1, 2 or 3
vm1_zone = "1"

# Define the type of storage account type for the osdisk
# Allowed values : Standard_LRS, StandardSSD_LRS, Premium_LRS, StandardSSD_ZRS and Premium_ZRS
vm1_osdisk_type = "StandardSSD_LRS"

# Specfiy if automatic updates are enabled for the Windows VM
# Allowed values : true (default) or false
vm1_autoupdate = false

# Specfiy the patch mode for the Windows VM
# Allowed values : Manual, AutomaticByOS (default) and AutomaticByPlatform
vm1_patch_mode = "Manual"

# Regular or Spot
vm1_priority = "Spot"

# define the size of the osdisk (in GB)
# vm1_osdisk_size = "128"

# Should a backup be done for the VM ? true or false
# The golden rule is to always deploy this backup policy for all VMs
create_backup_weekly_vm1 = false

# Should a data disk be created for the VM (in addition to the default osdisk) ? true or false
# You can ignore the values of the other datadisk variables if this variable is set to false
# Create datadisk1 ?
create_vm1_datadisk1 = false
# Create datadisk2 ?
create_vm1_datadisk2 = false
# Create datadisk3 ?
create_vm1_datadisk3 = false
# Create datadisk4 ?
create_vm1_datadisk4 = false
# Create datadisk5 ?
create_vm1_datadisk5 = false
# Create datadisk6 ?
create_vm1_datadisk6 = false

# Define the type of storage account type for the datadisk
# Allowed values : Standard_LRS, StandardSSD_LRS, Premium_LRS, StandardSSD_ZRS and Premium_ZRS
# datadisk1 type ?
vm1_datadisk1_type = "StandardSSD_LRS"
# datadisk2 type ?
vm1_datadisk2_type = "StandardSSD_LRS"
# datadisk3 type ?
vm1_datadisk3_type = "StandardSSD_LRS"
# datadisk4 type ?
vm1_datadisk4_type = "StandardSSD_LRS"
# datadisk5 type ?
vm1_datadisk5_type = "StandardSSD_LRS"
# datadisk6 type ?
vm1_datadisk6_type = "StandardSSD_LRS"

# Specify the size of the datadisks (in GB)
# diskdisk1 size ?
vm1_datadisk1_size = 16
# datadisk2 size ?
vm1_datadisk2_size = 16
# datadisk3 size ?
vm1_datadisk3_size = 16
# datadisk4 size ?
vm1_datadisk4_size = 16
# datadisk5 size ?
vm1_datadisk5_size = 16
# datadisk6 size ?
vm1_datadisk6_size = 16

# Define the type of Caching which should be used for the data disk
# Allowed values : None, ReadOnly, ReadWrite
# datadisk1 caching ?
vm1_datadisk1_caching = "ReadOnly"
# datadisk2 caching ?
vm1_datadisk2_caching = "ReadOnly"
# datadisk3 caching ?
vm1_datadisk3_caching = "ReadOnly"
# datadisk4 caching ?
vm1_datadisk4_caching = "ReadOnly"
#  datadisk5 caching ?
vm1_datadisk5_caching = "ReadOnly"
#  datadisk6 caching ?
vm1_datadisk6_caching = "ReadOnly"

#####################################################################################
#
# TAGS FOR VM1
#
#####################################################################################

tags_vm1_secret = {
  # free-form text
  Description = "none"
}

tags_vm1_nic_eth0 = {
  # free-form text
  Description = "none"
}

tags_vm1 = {
  # free-form text
  Description = "VM IMAGE TF Model"

  Backup = "nobackup"

  Backup_Agent = "no"

   # Tag pour l'assignation automatique dans le(s) bon(s) groupe(s) pour MDE
   # none
   # GRPC_MDE_WINCLIENT, 
   # GRPC_MDE_SERVER_APP_PROD,
   # GRPC_MDE_SERVER_ADMIN_PROD, 
   # GRPC_MDE_SERVER_BDD_PROD,
   # GRPC_MDE_SERVER_INFRA_PROD, 
   # GRPC_MDE_SERVER_BDD_PPD_QUAL_DEV, 
   # GRPC_MDE_SERVER_APP_PPD_QUAL_DEV,
   # GRPC_MDE_SERVER_ADMIN_PPD_QUAL_DEV, 
   # GRPC_MDE_SERVER_INFRA_PPD_QUAL_DEV,
   # GRPC_MDE_SERVER_APP_PROD, GRPC_MDE_SERVER_WIN2016_ASR,
   # GRPC_MDE_SERVER_ADMIN_PROD, GRPC_MDE_SERVER_WIN2016_ASR,
   # GRPC_MDE_SERVER_BDD_PROD, GRPC_MDE_SERVER_WIN2016_ASR,
   # GRPC_MDE_SERVER_INFRA_PROD, GRPC_MDE_SERVER_WIN2016_ASR,
   # GRPC_MDE_SERVER_BDD_PPD_QUAL_DEV, GRPC_MDE_SERVER_WIN2016_ASR,
   # GRPC_MDE_SERVER_APP_PPD_QUAL_DEV, GRPC_MDE_SERVER_WIN2016_ASR,
   # GRPC_MDE_SERVER_ADMIN_PPD_QUAL_DEV, GRPC_MDE_SERVER_WIN2016_ASR,
   # GRPC_MDE_SERVER_INFRA_PPD_QUAL_DEV, GRPC_MDE_SERVER_WIN2016_ASR,
  MDE_Server = "GRPC_MDE_SERVER_INFRA_PPD_QUAL_DEV"

  # pilot_group1, pilot_group2, pilot_group3
  # general_group1, general_group2, general_group3
  # none
  Maintenance_Group = "pilot_group3"

  # Uncomment this tag if the VM should be stopped during the night
  # Apply for all VMs in qualication or preprodution environment
  Sleep_Priority = "100"
}

tags_vm1_datadisk1 = {
  # free-form text
  Description = "none"
}

tags_vm1_datadisk2 = {
  # free-form text
  Description = "none"
}

tags_vm1_datadisk3 = {
  # free-form text
  Description = "none"
}

tags_vm1_datadisk4 = {
  # free-form text
  Description = "none"
}

tags_vm1_datadisk5 = {
  # free-form text
  Description = "none"
}

tags_vm1_datadisk6 = {
  # free-form text
  Description = "none"
}

# #######################################################################################
# #
# # Define variables for the windows VM2
# #
# #######################################################################################

# # Specify the name of the Azure Image to create the VM
# vm2_image_name = "Windows-2016-datacenter-14393.5356.220908"

# # Start the indexing of the VM at the value below (used for the VM name)
# vm2_index = "2"

# # Define which static IP address to allocate to the VM within the IP subnet
# # The first 3 IP addresses of an IP subnet are always reserved by Microsoft
# vm2_hostnum = "7"

# # Define the family and size of the VM(s)
# vm2_size = "Standard_D2s_v5"


# # Define in which avaibility zone (AZ) the first VM should be created : 1, 2 or 3
# vm2_zone = "2"

# # Define the type of storage account type for the osdisk
# # Allowed values : Standard_LRS, StandardSSD_LRS, Premium_LRS, StandardSSD_ZRS and Premium_ZRS
# vm2_osdisk_type = "StandardSSD_LRS"

# # Specfiy if automatic updates are enabled for the Windows VM
# # Allowed values : true (default) or false
# vm2_autoupdate = false

# # Specfiy the patch mode for the Windows VM
# # Allowed values : Manual, AutomaticByOS (default) and AutomaticByPlatform
# vm2_patch_mode = "Manual"

# Regular or Spot
# vm2_priority = "Spot"

# # Should a backup be done for the VM ? true or false
# The golden rule is to always deploy this backup policy for all VMs
# create_backup_weekly_vm2 = true

# # Should a data disk be created for the VM (in addition to the default osdisk) ? true or false
# # You can ignore the values of the other datadisk variables if this variable is set to false
# # Create datadisk1 ?
# create_vm2_datadisk1 = false
# # Create datadisk2 ?
# create_vm2_datadisk2 = false
# # Create datadisk3 ?
# create_vm2_datadisk3 = false
# # Create datadisk4 ?
# create_vm2_datadisk4 = false
# # Create datadisk5 ?
# create_vm2_datadisk5 = false
# # Create datadisk6 ?
# create_vm2_datadisk6 = false

# # Define the type of storage account type for the datadisk
# # Allowed values : Standard_LRS, StandardSSD_LRS, Premium_LRS, StandardSSD_ZRS and Premium_ZRS
# # datadisk1 type ?
# vm2_datadisk1_type = "StandardSSD_LRS"
# # datadisk2 type ?
# vm2_datadisk2_type = "StandardSSD_LRS"
# # datadisk3 type ?
# vm2_datadisk3_type = "StandardSSD_LRS"
# # datadisk4 type ?
# vm2_datadisk4_type = "StandardSSD_LRS"
# # datadisk5 type ?
# vm2_datadisk5_type = "StandardSSD_LRS"
# # datadisk6 type ?
# vm2_datadisk6_type = "StandardSSD_LRS"

# # Specify the size of the datadisks (in GB)
# # diskdisk1 size ?
# vm2_datadisk1_size = 16
# # datadisk2 size ?
# vm2_datadisk2_size = 16
# # datadisk3 size ?
# vm2_datadisk3_size = 16
# # datadisk4 size ?
# vm2_datadisk4_size = 16
# # datadisk5 size ?
# vm2_datadisk5_size = 16
# # datadisk6 size ?
# vm2_datadisk6_size = 16

# # Define the type of Caching which should be used for the data disk
# # Allowed values : None, ReadOnly, ReadWrite
# # datadisk1 caching ?
# vm2_datadisk1_caching = "ReadOnly"
# # datadisk2 caching ?
# vm2_datadisk2_caching = "ReadOnly"
# # datadisk3 caching ?
# vm2_datadisk3_caching = "ReadOnly"
# # datadisk4 caching ?
# vm2_datadisk4_caching = "ReadOnly"
# #  datadisk5 caching ?
# vm2_datadisk5_caching = "ReadOnly"
# #  datadisk6 caching ?
# vm2_datadisk6_caching = "ReadOnly"

# #####################################################################################
# #
# # TAGS FOR vm2
# #
# #####################################################################################

# tags_vm2_secret = {
#   # free-form text
#   Description = "none"
# }

# tags_vm2_nic_eth0 = {
#   # free-form text
#   Description = "none"
# }

# tags_vm2 = {
#   # free-form text
#   Description = "VM IMAGE TF Model"

#   Backup = "nobackup"
#   Backup_Agent = "no"

  #  # Tag pour l'assignation automatique dans le(s) bon(s) groupe(s) pour MDE
  #  # none
  #  # GRPC_MDE_WINCLIENT, 
  #  # GRPC_MDE_SERVER_APP_PROD,
  #  # GRPC_MDE_SERVER_ADMIN_PROD, 
  #  # GRPC_MDE_SERVER_BDD_PROD,
  #  # GRPC_MDE_SERVER_INFRA_PROD, 
  #  # GRPC_MDE_SERVER_BDD_PPD_QUAL_DEV, 
  #  # GRPC_MDE_SERVER_APP_PPD_QUAL_DEV,
  #  # GRPC_MDE_SERVER_ADMIN_PPD_QUAL_DEV, 
  #  # GRPC_MDE_SERVER_INFRA_PPD_QUAL_DEV,
  #  # GRPC_MDE_SERVER_APP_PROD, GRPC_MDE_SERVER_WIN2016_ASR,
  #  # GRPC_MDE_SERVER_ADMIN_PROD, GRPC_MDE_SERVER_WIN2016_ASR,
  #  # GRPC_MDE_SERVER_BDD_PROD, GRPC_MDE_SERVER_WIN2016_ASR,
  #  # GRPC_MDE_SERVER_INFRA_PROD, GRPC_MDE_SERVER_WIN2016_ASR,
  #  # GRPC_MDE_SERVER_BDD_PPD_QUAL_DEV, GRPC_MDE_SERVER_WIN2016_ASR,
  #  # GRPC_MDE_SERVER_APP_PPD_QUAL_DEV, GRPC_MDE_SERVER_WIN2016_ASR,
  #  # GRPC_MDE_SERVER_ADMIN_PPD_QUAL_DEV, GRPC_MDE_SERVER_WIN2016_ASR,
  #  # GRPC_MDE_SERVER_INFRA_PPD_QUAL_DEV, GRPC_MDE_SERVER_WIN2016_ASR,
  # MDE_Server = "GRPC_MDE_SERVER_INFRA_PPD_QUAL_DEV"

  # # pilot_group1, pilot_group2, pilot_group3
  # # general_group1, general_group2, general_group3
  # # none
  # Maintenance_Group = "pilot_group3"

#   # Uncomment this tag if the VM should be stopped during the night
#   # Apply for all VMs in qualication or preprodution environment
#   Sleep_Priority = "100"
# }

# tags_vm2_datadisk1 = {
#   # free-form text
#   Description = "none"

# }

# tags_vm2_datadisk2 = {
#   # free-form text
#   Description = "none"
# }

# tags_vm2_datadisk3 = {
#   # free-form text
#   Description = "none"
# }

# tags_vm2_datadisk4 = {
#   # free-form text
#   Description = "none"
# }

# tags_vm2_datadisk5 = {
#   # free-form text
#   Description = "none"
# }

# tags_vm2_datadisk6 = {
#   # free-form text
#   Description = "none"
# }