# Subscription ID
subid = "325177c3-fdc7-48c7-92b4-a4d8b6ca48a8"

# Allowed values : p, u, q, , h
env = "q"

# Full name of the application or infrastructure service
# Used to build the name the RG name (no lentgth limitation) and the NSG following Fidal naming convention
service_fullname = "tfmodel"

#####################################################################################
#
# data sources
#
#####################################################################################

# Specify the resource group name of the bootdiag
bootdiag_rg = "rg-tfmodel-qual-001"

#####################################################################################
#                                                                      
# TAGS                                                             
#                                                                        
#####################################################################################

tags_always = {
  # Change for the email of the terraform builder
  Builder = "firstname.lastname@domain.com"

  # Allowed values : production, preproduction, qualification, sandbox, homologation
  Environment = "qualification"

  # Allowed values : manual, terraform/<directory name hosting the TF files>
  Deployment = "terraform/00-Model-Resources/002-VM-Bootdiag"
}

tags_service = {
  # Change for the ROS email of this service
  ROS = "firstname.lastname@fidal.com"

  # Change for the name of the service
  Service_Name = "TF Model"

  # Change for the ID of the service (SIxxxxx or SAxxxxx)
  Service_ID = "SI00000"
}

tags_bootdiag = {
  # free-form text
  Description = "Compte de stockage pour le boot diagnostic des VM du TF Model"

  Backup = "nobackup"

  AzDefenderPlanAutoEnable = "off"
}