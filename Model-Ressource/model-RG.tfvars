# Subscription ID
subid = "325177c3-fdc7-48c7-92b4-a4d8b6ca48a8"

# Allowed values : prod, ppd, qual, sdbx, homl
env = "qual"

# Full name of the application or infrastructure service
# Used to build the name the RG name (no lentgth limitation) and the NSG following Fidal naming convention
service_fullname = "tfmodel"

#####################################################################################
#                                                                      
# TAGS                                                             
#                                                                        
#####################################################################################

tags_always = {
 # Change for the email of the terraform builder
  Builder = "prenom.nom@company.com"

  # Allowed values : production, preproduction, qualification, sandbox, homologation
  Environment = "qualification"

  # Allowed values : manual, terraform/<directory name hosting the TF files>
  Deployment = "terraform/00-Model-Resources/001-RG"
}

tags_service = {
  # Change for the ROS email of this service
  ROS = "prenom.nom@fidal.com"

  # Change for the name of the service
  Service_Name = "TF Model"

  # Change for the ID of the service (SIxxxxx or SAxxxxx)
  Service_ID = "SI00000"
}

tags_rg = {
  # free-form text
  Description = "Groupe de ressource du template TF"
}