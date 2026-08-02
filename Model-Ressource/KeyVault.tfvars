#####################################################################################
#                                                                      
# Subscription ID                                                         
#                                                                        
#####################################################################################

subid = "325177c3-fdc7-48c7-92b4-a4d8b6ca48a8"



#####################################################################################
#                                                                      
# DEFINE VARIABLES FOR THE KEY VAULT (global)                                                            
#                                                                        
#####################################################################################

# Environment
# Allowed values : prod, ppd, qual, sdbx, homl
env = "qual"

# Full name of the application or infrastructure service
# Used to build the name the kay-vault following Fidal naming convention
service_fullname = "tfmodel"

#####################################################################################
#                                                                      
# Datasources (global)                                                            
#                                                                        
#####################################################################################

# name of the RG for the KV
kv_rg = "rg-tfmodel-qual-001"

#####################################################################################
#                                                                      
# TAGS (global)                                                            
#                                                                        
#####################################################################################

tags_always = {
  # Change for the email of the terraform builder
  Builder = "prenom.nom@company.com"

  # Allowed values : production, preproduction, qualification, sandbox, homologation
  Environment = "qualification"

  # Allowed values : manual, terraform/<directory name hosting the TF files>
  Deployment = "terraform/00-Model-Resources/003-KEY-VAULT"
}

tags_service = {
  # Change for the ROS email of this service
  ROS = "prenom.nom@fidal.com"

  # Change for the name of the service
  Service_Name = "TF Model"

  # Change for the ID of the service (SIxxxxx or SAxxxxx)
  Service_ID = "SI00000"
}

#####################################################################################
#                                                                      
# DEFINE VARIABLES FOR KV1                                              
#                                                                        
#####################################################################################

# index used for the naming of the KV
kv1_index = "1"

# The Default Action to use when no rules match from ip_rules / virtual_network_subnet_ids. 
# Possible values are Allow and Deny
kv1_default_action = "Deny"

# One or more IP Addresses, or CIDR Blocks which should be able to access the Key Vault.
# Azure fwl1 : 51.124.104.72
# Azure fwl2 : 20.56.51.3
# CATO POP1 : 209.206.8.69
# CATO POP2 : 85.255.24.134
kv1_iprules = ["85.255.24.134", "209.206.8.69", "20.56.51.3", "51.124.104.72"]

#One or more subnets, should be able to access the kv1 Key Vault.
kv1_subnet_ids = [
  # {
  #   subnet_name = "snet-qual-westeurope-tfmodel1-001"
  #   vnet_name   = "vnet-qual-westeurope-tfmodel-001"
  #   vnet_rg     = "rg-network-qual-001"
  # }
  # add more subnet below if necessary with comma separation
]

# Group Role assignment should be able to access the kv1 Key Vault.
kv1_grp_role_assignments = [
  # comment out the group role assignment below if not needed
  #  {
  #    group_name = "GRPC_USRADM_ARCHITECTURE", role = "Key Vault Administrator"
  #  }
  # add more group role assignments below if necessary with comma separation
]

# UAMI Role assignment should be able to access the kv1 Key Vault
kv1_uami_role_assignments = [
  # comment out the uami role assignment below if not needed
  # {
  #   uami_name = "id-q-tfmodel-01"
  #   uami_rg   = "rg-tfmodel-qual-001"
  #   role      = "Key Vault Secrets User"
  # }
  # add more uami role assignments below if necessary with comma separation
]

# Public network access
kv1_public_network_access_enabled = false

# Private endpoint configiration for kv1
kv1_private_endpoint = {
    #Name of the subnet in which the private endpoint will be configured
    subnet_name   = ""
    #Name of the network in which the subnet is located
    vnet_name     = ""
    #Name of the rg in which the vnet is located
    vnet_rg       = ""
    #IP address of the private endpoint. It is used for communication with the kv1.
    kv_ip_address = ""
    #Name of the ASG to assign to the private endpoint
    asg_name      = ""
    #Name of the asg rg
    asg_rg        = ""
  }

# Diagnostic Setting for kv1
kv1_enabled_ds = false
log_analytics_workspace_name = "log-prod-perf001"
log_analytics_resource_group = "rg-ope-prod-001"

#####################################################################################
#                                                                      
# TAGS KV1                                              
#                                                                        
#####################################################################################

tags_kv1 = {
  # free-form text
  Description = "Key vault TF Model"
}