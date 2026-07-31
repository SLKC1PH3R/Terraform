#####################################################################################
#                                                                      
# Subscription ID                                                         
#                                                                        
#####################################################################################

subid = "325177c3-fdc7-48c7-92b4-a4d8b6ca48a8"

#####################################################################################
#                                                                      
# DEFINE VARIABLES FOR THE INTERNAL LOAD-BALANCER (global)                                                            
#                                                                        
#####################################################################################

# Environment
# Allowed values : prod, ppd, qual, sdbx, homl
env = "qual"

# Full name of the application or infrastructure service
# Used to build the name the RG name and the NSG following Fidal naming convention
service_fullname = "tfmodel"

#######################################################################################
#                                                                      
# Datasources (global)                                                     
#                                                                        
#######################################################################################

# name of the RG for the ILB
ilb_rg = "rg-tfmodel-qual-001"

# name of the vnet/subnet which will host the ILB
subnet1_name = "snet-qual-westeurope-tfmodel1-001"
vnet_name    = "vnet-qual-westeurope-tfmodel-001"

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
  Deployment = "terraform/00-Model-Resources/003-ILB"
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
# DEFINE VARIABLES FOR ILB1                                                  
#                                                                        
#####################################################################################

# index used for the naming of the KV
ilb1_index = "1"

# host number in the subnet - will permit to define the IP allocation
ilb1_hostnum = "14"

#-------------------------------------------
# Create HTTPS Probe/Rule ? true or false
#-------------------------------------------

ilb1_create_https_probe = false
# set a value if true
ilb1_probe_https_request_path_name = "/"

# HTTPS rule
# Valid values are between 4 and 30 - Defaults to 4 min. 
ilb1_https_rule_idle_timeout = "4"

# Possible values are: 
# Default – The load balancer is configured to use a 5 tuple hash to map traffic to available servers.
# SourceIP – The load balancer is configured to use a 2 tuple hash to map traffic to available servers. 
# SourceIPProtocol – The load balancer is configured to use a 3 tuple hash to map traffic to available servers. 
# Also known as Session Persistence, where the options are called None, Client IP and Client IP and Protocol respectively
ilb1_https_rule_load_distribution = "Default"

# Are the Floating IPs enabled for this Load Balancer Rule? 
# A "floating” IP is reassigned to a secondary server in case the primary server fails.
# Required to configure a SQL AlwaysOn Availability Group. Defaults to false.
ilb1_https_rule_floating_ip = false

#-------------------------------------------
# Create HTTP Probe/Rule ? true or false
#-------------------------------------------

ilb1_create_http_probe = false
# set a value if true
ilb1_probe_http_request_path_name = "/"

# HTTP rule
# Valid values are between 4 and 30 - Defaults to 4 min. 
ilb1_http_rule_idle_timeout = "4"

# Possible values are: 
# Default – The load balancer is configured to use a 5 tuple hash to map traffic to available servers.
# SourceIP – The load balancer is configured to use a 2 tuple hash to map traffic to available servers. 
# SourceIPProtocol – The load balancer is configured to use a 3 tuple hash to map traffic to available servers. 
# Also known as Session Persistence, where the options are called None, Client IP and Client IP and Protocol respectively
ilb1_http_rule_load_distribution = "Default"

# Are the Floating IPs enabled for this Load Balancer Rule? 
# A "floating” IP is reassigned to a secondary server in case the primary server fails.
# Required to configure a SQL AlwaysOn Availability Group. Defaults to false.
ilb1_http_rule_floating_ip = false


#-------------------------------------------
# Create Probe1/Rule1 ? true or false
#-------------------------------------------

ilb1_create_probe1   = true
ilb1_tcp_port_probe1 = "22"

# Rule1
# Valid values are between 4 and 30 - Defaults to 4 min. 
ilb1_rule1_idle_timeout = "4"

# Possible values are Tcp, Udp or All.
ilb1_rule1_protocol = "All"

# The port for the external endpoint. Port numbers for each Rule must be unique within the Load Balancer. 
# Possible values range between 0 and 65534, inclusive.
ilb1_rule1_frontend_port = "0"

# The port used for internal connections on the endpoint. 
# Possible values range between 0 and 65535, inclusive.
ilb1_rule1_backend_port = "0"

# Possible values are: 
# Default – The load balancer is configured to use a 5 tuple hash to map traffic to available servers.
# SourceIP – The load balancer is configured to use a 2 tuple hash to map traffic to available servers. 
# SourceIPProtocol – The load balancer is configured to use a 3 tuple hash to map traffic to available servers. 
# Also known as Session Persistence, where the options are called None, Client IP and Client IP and Protocol respectively
ilb1_rule1_load_distribution = "Default"

# Are the Floating IPs enabled for this Load Balancer Rule? 
# A "floating” IP is reassigned to a secondary server in case the primary server fails.
# Required to configure a SQL AlwaysOn Availability Group. Defaults to false.
ilb1_rule1_floating_ip = false

# Is TCP Reset enabled for this Load Balancer Rule?
# Set to true if protocol is Tcp (unless specified otherwise)
# Set to false if protocol is Udp
ilb1_rule1_tcp_reset = true

#-------------------------------------------
# Create Probe2/Rule2 ? true or false
#-------------------------------------------

ilb1_create_probe2   = false
ilb1_tcp_port_probe2 = "3389"

# Rule1
# Valid values are between 4 and 30 - Defaults to 4 min. 
ilb1_rule2_idle_timeout = "4"

# Possible values are Tcp, Udp or All.
ilb1_rule2_protocol = "Tcp"

# The port for the external endpoint. Port numbers for each Rule must be unique within the Load Balancer. 
# Possible values range between 0 and 65534, inclusive.
ilb1_rule2_frontend_port = "3389"

# The port used for internal connections on the endpoint. 
# Possible values range between 0 and 65535, inclusive.
ilb1_rule2_backend_port = "3389"

# Possible values are: 
# Default – The load balancer is configured to use a 5 tuple hash to map traffic to available servers.
# SourceIP – The load balancer is configured to use a 2 tuple hash to map traffic to available servers. 
# SourceIPProtocol – The load balancer is configured to use a 3 tuple hash to map traffic to available servers. 
# Also known as Session Persistence, where the options are called None, Client IP and Client IP and Protocol respectively
ilb1_rule2_load_distribution = "Default"

# Are the Floating IPs enabled for this Load Balancer Rule? 
# A "floating” IP is reassigned to a secondary server in case the primary server fails.
# Required to configure a SQL AlwaysOn Availability Group. Defaults to false.
ilb1_rule2_floating_ip = false

# Is TCP Reset enabled for this Load Balancer Rule?
# Set to true if protocol is Tcp (unless specified otherwise)
# Set to false if protocol is Udp
ilb1_rule2_tcp_reset = true

#-------------------------------------------
# Create Probe3/Rule3 ? true or false
#-------------------------------------------

ilb1_create_probe3   = false
ilb1_tcp_port_probe3 = "10000"

# Rule1
# Valid values are between 4 and 30 - Defaults to 4 min. 
ilb1_rule3_idle_timeout = "4"

# Possible values are Tcp, Udp or All.
ilb1_rule3_protocol = "Udp"

# The port for the external endpoint. Port numbers for each Rule must be unique within the Load Balancer. 
# Possible values range between 0 and 65534, inclusive.
ilb1_rule3_frontend_port = "5000"

# The port used for internal connections on the endpoint. 
# Possible values range between 0 and 65535, inclusive.
ilb1_rule3_backend_port = "5000"

# Possible values are: 
# Default – The load balancer is configured to use a 5 tuple hash to map traffic to available servers.
# SourceIP – The load balancer is configured to use a 2 tuple hash to map traffic to available servers. 
# SourceIPProtocol – The load balancer is configured to use a 3 tuple hash to map traffic to available servers. 
# Also known as Session Persistence, where the options are called None, Client IP and Client IP and Protocol respectively
ilb1_rule3_load_distribution = "SourceIP"

# Are the Floating IPs enabled for this Load Balancer Rule? 
# A "floating” IP is reassigned to a secondary server in case the primary server fails.
# Required to configure a SQL AlwaysOn Availability Group. Defaults to false.
ilb1_rule3_floating_ip = false

# Is TCP Reset enabled for this Load Balancer Rule?
# Set to true if protocol is Tcp (unless specified otherwise)
# Set to false if protocol is Udp
ilb1_rule3_tcp_reset = false

#######################################################################################
#                                                                      
# Datasources ILB1                                                       
#                                                                        
#######################################################################################

# IP address of VM1 to add in the LB backendpool
ilb1_backendpool_ip1 = "172.18.13.4"

# IP address of VM2 to add in the LB backendpool
ilb1_backendpool_ip2 = "172.18.13.5"

#####################################################################################
#                                                                      
# TAGS ILB1                                                      
#                                                                        
#####################################################################################

tags_ilb1 = {
  # free-form text
  Description = "Load-Balancer TF Model"
}

#####################################################################################
#                                                                      
# DEFINE VARIABLES FOR ILB2                                                 
#                                                                        
#####################################################################################

# # index used for the naming of the KV
# ilb2_index = "2"

# # host number in the subnet to define the IP allocation
# ilb2_hostnum = "13"

# #-------------------------------------------
# # Create HTTPS Probe/Rule ? true or false
# #-------------------------------------------

# ilb2_create_https_probe = false
# # set a value if true
# ilb2_probe_https_request_path_name = "/"

# # HTTPS rule
# # Valid values are between 4 and 30 - Defaults to 4 min. 
# ilb2_https_rule_idle_timeout = "4"

# # Possible values are: 
# # Default – The load balancer is configured to use a 5 tuple hash to map traffic to available servers.
# # SourceIP – The load balancer is configured to use a 2 tuple hash to map traffic to available servers. 
# # SourceIPProtocol – The load balancer is configured to use a 3 tuple hash to map traffic to available servers. 
# # Also known as Session Persistence, where the options are called None, Client IP and Client IP and Protocol respectively
# ilb2_https_rule_load_distribution = "Default"

# # Are the Floating IPs enabled for this Load Balancer Rule? 
# # A "floating” IP is reassigned to a secondary server in case the primary server fails.
# # Required to configure a SQL AlwaysOn Availability Group. Defaults to false.
# ilb2_https_rule_floating_ip = false


# #-------------------------------------------
# # Create HTTP Probe/Rule ? true or false
# #-------------------------------------------

# ilb2_create_http_probe = false
# # set a value if true
# ilb2_probe_http_request_path_name = "/"

# # HTTP rule
# # Valid values are between 4 and 30 - Defaults to 4 min. 
# ilb2_http_rule_idle_timeout = "4"

# # Possible values are: 
# # Default – The load balancer is configured to use a 5 tuple hash to map traffic to available servers.
# # SourceIP – The load balancer is configured to use a 2 tuple hash to map traffic to available servers. 
# # SourceIPProtocol – The load balancer is configured to use a 3 tuple hash to map traffic to available servers. 
# # Also known as Session Persistence, where the options are called None, Client IP and Client IP and Protocol respectively
# ilb2_http_rule_load_distribution = "Default"

# # Are the Floating IPs enabled for this Load Balancer Rule? 
# # A "floating” IP is reassigned to a secondary server in case the primary server fails.
# # Required to configure a SQL AlwaysOn Availability Group. Defaults to false.
# ilb2_http_rule_floating_ip = false

# #-------------------------------------------
# # Create Probe1/Rule1 ? true or false
# #-------------------------------------------

# ilb2_create_probe1   = true
# ilb2_tcp_port_probe1 = "22"

# # Rule1
# # Valid values are between 4 and 30 - Defaults to 4 min. 
# ilb2_rule1_idle_timeout = "4"

# # Possible values are Tcp, Udp or All.
# ilb2_rule1_protocol = "All"

# # The port for the external endpoint. Port numbers for each Rule must be unique within the Load Balancer. 
# # Possible values range between 0 and 65534, inclusive.
# ilb2_rule1_frontend_port = "0"

# # The port used for internal connections on the endpoint. 
# # Possible values range between 0 and 65535, inclusive.
# ilb2_rule1_backend_port = "0"

# # Possible values are: 
# # Default – The load balancer is configured to use a 5 tuple hash to map traffic to available servers.
# # SourceIP – The load balancer is configured to use a 2 tuple hash to map traffic to available servers. 
# # SourceIPProtocol – The load balancer is configured to use a 3 tuple hash to map traffic to available servers. 
# # Also known as Session Persistence, where the options are called None, Client IP and Client IP and Protocol respectively
# ilb2_rule1_load_distribution = "Default"

# # Are the Floating IPs enabled for this Load Balancer Rule? 
# # A "floating” IP is reassigned to a secondary server in case the primary server fails.
# # Required to configure a SQL AlwaysOn Availability Group. Defaults to false.
# ilb2_rule1_floating_ip = false

# # Is TCP Reset enabled for this Load Balancer Rule?
# # Set to true if protocol is Tcp (unless specified otherwise)
# # Set to false if protocol is Udp
# ilb2_rule1_tcp_reset = true

# #-------------------------------------------
# # Create Probe2/Rule2 ? true or false
# #-------------------------------------------

# ilb2_create_probe2   = false
# ilb2_tcp_port_probe2 = "3389"

# # Rule1
# # Valid values are between 4 and 30 - Defaults to 4 min. 
# ilb2_rule2_idle_timeout = "4"

# # Possible values are Tcp, Udp or All.
# ilb2_rule2_protocol = "Tcp"

# # The port for the external endpoint. Port numbers for each Rule must be unique within the Load Balancer. 
# # Possible values range between 0 and 65534, inclusive.
# ilb2_rule2_frontend_port = "3389"

# # The port used for internal connections on the endpoint. 
# # Possible values range between 0 and 65535, inclusive.
# ilb2_rule2_backend_port = "3389"

# # Possible values are: 
# # Default – The load balancer is configured to use a 5 tuple hash to map traffic to available servers.
# # SourceIP – The load balancer is configured to use a 2 tuple hash to map traffic to available servers. 
# # SourceIPProtocol – The load balancer is configured to use a 3 tuple hash to map traffic to available servers. 
# # Also known as Session Persistence, where the options are called None, Client IP and Client IP and Protocol respectively
# ilb2_rule2_load_distribution = "Default"

# # Are the Floating IPs enabled for this Load Balancer Rule? 
# # A "floating” IP is reassigned to a secondary server in case the primary server fails.
# # Required to configure a SQL AlwaysOn Availability Group. Defaults to false.
# ilb2_rule2_floating_ip = false

# # Is TCP Reset enabled for this Load Balancer Rule?
# # Set to true if protocol is Tcp (unless specified otherwise)
# # Set to false if protocol is Udp
# ilb2_rule2_tcp_reset = true

# #-------------------------------------------
# # Create Probe3/Rule3 ? true or false
# #-------------------------------------------

# ilb2_create_probe3   = false
# ilb2_tcp_port_probe3 = "10000"

# # Rule1
# # Valid values are between 4 and 30 - Defaults to 4 min. 
# ilb2_rule3_idle_timeout = "4"

# # Possible values are Tcp, Udp or All.
# ilb2_rule3_protocol = "Udp"

# # The port for the external endpoint. Port numbers for each Rule must be unique within the Load Balancer. 
# # Possible values range between 0 and 65534, inclusive.
# ilb2_rule3_frontend_port = "5000"

# # The port used for internal connections on the endpoint. 
# # Possible values range between 0 and 65535, inclusive.
# ilb2_rule3_backend_port = "5000"

# # Possible values are: 
# # Default – The load balancer is configured to use a 5 tuple hash to map traffic to available servers.
# # SourceIP – The load balancer is configured to use a 2 tuple hash to map traffic to available servers. 
# # SourceIPProtocol – The load balancer is configured to use a 3 tuple hash to map traffic to available servers. 
# # Also known as Session Persistence, where the options are called None, Client IP and Client IP and Protocol respectively
# ilb2_rule3_load_distribution = "SourceIP"

# # Are the Floating IPs enabled for this Load Balancer Rule? 
# # A "floating” IP is reassigned to a secondary server in case the primary server fails.
# # Required to configure a SQL AlwaysOn Availability Group. Defaults to false.
# ilb2_rule3_floating_ip = false

# # Is TCP Reset enabled for this Load Balancer Rule?
# # Set to true if protocol is Tcp (unless specified otherwise)
# # Set to false if protocol is Udp
# ilb2_rule3_tcp_reset = false

# #######################################################################################
# #                                                                      
# # Datasources ILB2                                                     
# #                                                                        
# #######################################################################################

# # IP address of VM1 to add in the LB backendpool
# ilb2_backendpool_ip1 = "172.18.13.6"

# # IP address of VM2 to add in the LB backendpool
# ilb2_backendpool_ip2 = "172.18.13.7"

# #####################################################################################
# #                                                                      
# # TAGS ILB2                                                     
# #                                                                        
# #####################################################################################

# tags_ilb2 = {
#   # free-form text
#   Description = "Load-Balancer TF Model"
# }