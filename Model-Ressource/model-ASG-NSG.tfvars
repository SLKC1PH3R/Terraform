
# Subscription ID
subid = "325177c3-fdc7-48c7-92b4-a4d8b6ca48a8"

#######################################################################################
#                                                                      
# Define variables for the ASG and the NSG rules (global)                                                      
#                                                                        
#######################################################################################

# naming convention is different for infrastructure VM and application VM, and therefore associated ASG and NSG rules
# vm_type = "infrastructure"
vm_type = "application"

# Allowed values : prod, ppd, qual, sdbx, homl
env = "qual"

# Full name of the infrastructure service
# Used to build the name of the NSG following Fidal naming convention
service_fullname = "tfmodel"

# Specify the application number
# Allowed values : 1 to 999
# Put a value only if vm_type = "application"
app_number = "1"

#######################################################################################
#                                                                      
# Define variables for the ASG1 / VMs ROLE1                                                  
#                                                                        
#######################################################################################

# Short name used for the infra VM
# Used to build the name of the infrastructure VM (6 characters max) and ASG name following Fidal naming convention
# Put a value only if vm_type = "infrastructure"
infra_shortname1 = ""

# Short name of the service (7 charachers max) + role of the VM (3 characters : web, bdd, lic, ...)
# Used to build the name of the VM if it is an application VM and its ASG
# Put a value only if vm_type = "application"
app_shortname1 = "tfmodelweb"

#######################################################################################
#                                                                      
# Define variables for the ASG1 / VMs ROLE3                                                  
#                                                                        
#######################################################################################

# Short name used for the infra VM
# Used to build the name of the infrastructure VM (6 characters max) and ASG name following Fidal naming convention
# Put a value only if vm_type = "infrastructure"
infra_shortname2 = ""

# Short name of the service (7 charachers max) + role of the VM (3 characters : web, bdd, lic, ...)
# Used to build the name of the VM if it is an application VM and its ASG
# Put a value only if vm_type = "application"
app_shortname2 = "tfmodelbdd"

#######################################################################################
#                                                                      
# Datasources                                                  
#                                                                        
#######################################################################################

# name of the NSG where to deploy new NSG Rules
nsg1_name = "nsg-qual-tfmodel1-001"

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
  Deployment = "terraform/00-Model-Resources/002-ASG-NSG-RULES"
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
# TAGS (ASG1 / VMs ROLE1)                                                         
#                                                                        
#####################################################################################

tags_asg1_vmrole1_eth0 = {

  # free-form text
  Description = "ASG du template TF Model - VM ROLE1"
}

#####################################################################################
#                                                                      
# TAGS (ASG1 / VMs ROLE3)                                                         
#                                                                        
#####################################################################################

tags_asg1_vmrole3_eth0 = {
  # free-form text
  Description = "ASG du template TF Model - VM ROLE3"
}