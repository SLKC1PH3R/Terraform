#####################################################################################
#                                                                                   #
# Title : Create new NSG rules in Azure associated to NSG variable var.nsg1_name    #
# Author : Phou-ngan.vannaxay@fidal.com                                             #
# Date : 31/08/2023                                                                 #
#                                                                                   #
#####################################################################################

#################################################################################################
#
# Est-West traffic inside the APP VNET is denied by default
# Define the security rules required by this application for East-West traffic inside the App VNET
# East-West security is provided with inbound rules only (outbound traffic is always allowed)
# (North-South traffic is secured by the Fortigate firewall in the hub VNET)
# 
# Rule priority from 200 to 999   : 
# East-West traffic to permit between the different resources inside the IP subnet of this application in production environment
# Use ASG when relevant
#
# Rule priority from 1000 to 1999 : 
# East-West traffic to permit between the different resources inside the IP subnet of this application in preproduction/uat environment
# Use ASG when relevant
#
# Rule priority from 2000 to 2999 :
# East-West traffic to permit between the production resources and the preproduction/uat of this application
# Use ASG when relevant
#
# Rule priority from 3000 to 3499 :
# East-West trafic to permit between the production resources of this application and the production resources of another application (in the same APP VNET)
# Use ASG when relevant
#
# Rule priority from 3500 to 3999 :
# East-West traffic to permit between the preproduction/uat resources of this application and the preproduction/uat resources of another application (in the same APP VNET)
# Use ASG when relevant
#
#################################################################################################

locals {
  nsg_name = var.vm_type == "application" ? format("%s%03d", "app", var.app_number) : var.service_fullname

  # basic rule with single source/destination port and single source/destination address prefix (or ASGs)
  # can you wildcard '*' for 'Any'
  nsgrules = {

    
    # rule200 is an example - modify rule200 and add more rules according to the matrix flows if needed

    rule200 = {
      name      = format("%s-%s-%s-%s", "nsg", var.env, local.nsg_name, "rule200_inbound")
      priority  = 200
      direction = "Inbound"
      access    = "Allow"

      # Tcp, Udp, Icmp, Esp, Ah or * 
      protocol               = "Tcp"
      source_port_range      = "*"
      destination_port_range = "443"

      # at least 1 of the 2 parameters is required
      source_address_prefix                 = ""
      source_application_security_group_ids = [azurerm_application_security_group.asg1_vmrole1_eth0.id]

      # at least 1 of the 2 parameters is required
      destination_address_prefix                 = ""
      destination_application_security_group_ids = [azurerm_application_security_group.asg1_vmrole3_eth0.id]
    }

    # Add more rules here if needed  


  }

  # Rules with multiple destinations ports
  nsgrules_dstports = {

    /*
    # rule210 is an example - modify rule210 and add more rules according to the matrix flows if needed

    rule210 = {
      name      = format("%s-%s-%s-%s", "nsg", var.env, local.nsg_name, "rule210_inbound")
      priority  = 210
      direction = "Inbound"
      access    = "Allow"

      # Tcp, Udp, Icmp, Esp, Ah or * 
      protocol               = "Tcp"
      source_port_range      = "*"
      destination_port_ranges = ["80", "443"]

      # at least 1 of the 2 parameters is required
      source_address_prefix                 = ""
      source_application_security_group_ids = [azurerm_application_security_group.asg1_vmrole1_eth0.id]

      # at least 1 of the 2 parameters is required
      destination_address_prefix                 = ""
      destination_application_security_group_ids = [azurerm_application_security_group.asg1_vmrole3_eth0.id]
    }

    # Add more rules here if needed  

    */
  }

  # Rules with mulitple source address prefixes 
  nsgrules_srcprefixes = {

    /*
    # rule220 is an example - modify rule220 and add more rules according to the matrix flows if needed

    rule220 = {
      name      = format("%s-%s-%s-%s", "nsg", var.env, local.nsg_name, "rule220_inbound")
      priority  = 220
      direction = "Inbound"
      access    = "Allow"

      # Tcp, Udp, Icmp, Esp, Ah or * 
      protocol               = "Icmp"
      source_port_range      = "*"
      destination_port_range = "*"

      # at least 1 of the 2 parameters is required
      source_address_prefixes                 = []
      source_application_security_group_ids = [azurerm_application_security_group.asg1_vmrole1_eth0.id]

      # at least 1 of the 2 parameters is required
      destination_address_prefix                 = ""
      destination_application_security_group_ids = [azurerm_application_security_group.asg1_vmrole1_eth0.id]
    }

    # Add more rules here if needed 

    */
  }

  # Rules with mulitple destination address prefixes 
  nsgrules_dstprefixes = {

    /*
    # rule230 is an example - modify rule230 and add more rules according to the matrix flows if needed

    rule220 = {
      name      = format("%s-%s-%s-%s", "nsg", var.env, local.nsg_name, "rule230_inbound")
      priority  = 230
      direction = "Inbound"
      access    = "Allow"

      # Tcp, Udp, Icmp, Esp, Ah or * 
      protocol               = "Icmp"
      source_port_range      = "*"
      destination_port_range = "*"

      # at least 1 of the 2 parameters is required
      source_address_prefix                 = ""
      source_application_security_group_ids = [azurerm_application_security_group.asg1_vmrole1_eth0.id]

      # at least 1 of the 2 parameters is required
      destination_address_prefixes                 = []
      destination_application_security_group_ids = [azurerm_application_security_group.asg1_vmrole1_eth0.id]
    }

    # Add more rules here if needed  

    */
  }


  # Rules with mulitple source address prefixes and multiple destination address prefixes
  nsgrules_srcprefixes_dstprefixes = {

    /*
    # rule240 is an example - modify rule240 and add more rules according to the matrix flows if needed

    rule240 = {
      name      = format("%s-%s-%s-%s", "nsg", var.env, local.nsg_name, "rule240_inbound")
      priority  = 240
      direction = "Inbound"
      access    = "Allow"

      # Tcp, Udp, Icmp, Esp, Ah or * 
      protocol               = "Icmp"
      source_port_range      = "*"
      destination_port_range = "*"

      # at least 1 of the 2 parameters is required
      source_address_prefixes                 = []
      source_application_security_group_ids = [azurerm_application_security_group.asg1_vmrole1_eth0.id]

      # at least 1 of the 2 parameters is required
      destination_address_prefixes                 = []
      destination_application_security_group_ids = [azurerm_application_security_group.asg1_vmrole1_eth0.id]
    }

    # Add more rules here if needed  

    */
  }


  # Rules with multiple destination address prefixes and multiple destination ports
  nsgrules_dstprefixes_dstports = {

    /*
    # rule250 is an example - modify rule250 and add more rules according to the matrix flows if needed

    rule250 = {
      name      = format("%s-%s-%s-%s", "nsg", var.env, local.nsg_name, "rule250_inbound")
      priority  = 250
      direction = "Inbound"
      access    = "Allow"

      # Tcp, Udp, Icmp, Esp, Ah or * 
      protocol               = "Tcp"
      source_port_range      = "*"
      destination_port_ranges = ["80, "443"]

      # at least 1 of the 2 parameters is required
      source_address_prefix                 = ""
      source_application_security_group_ids = [azurerm_application_security_group.asg1_vmrole1_eth0.id]

      # at least 1 of the 2 parameters is required
      destination_address_prefixes                 = []
      destination_application_security_group_ids = [azurerm_application_security_group.asg1_vmrole1_eth0.id]
    }

    # Add more rules here if needed  

    */
  }


  # Rules with multiple source address prefixes and multiple destination ports
  nsgrules_srcprefixes_dstports = {

    /*
    # rule260 is an example - modify rule260 and add more rules according to the matrix flows if needed

    rule260 = {
      name      = format("%s-%s-%s-%s", "nsg", var.env, local.nsg_name, "rule260_inbound")
      priority  = 260
      direction = "Inbound"
      access    = "Allow"

      # Tcp, Udp, Icmp, Esp, Ah or * 
      protocol               = "Tcp"
      source_port_range      = "*"
      destination_port_ranges = ["80, "443"]

      # at least 1 of the 2 parameters is required
      source_address_prefixes                 = []
      source_application_security_group_ids = [azurerm_application_security_group.asg1_vmrole1_eth0.id]

      # at least 1 of the 2 parameters is required
      destination_address_prefix                 = ""
      destination_application_security_group_ids = [azurerm_application_security_group.asg1_vmrole1_eth0.id]
    }

    # Add more rules here if needed  

    */
  }

  # Rules with mulitple source address prefixes, multiple destination and multiple destination ports
  nsgrules_srcprefixes_dstprefixes_dstports = {

    # rule270 is an example - modify rule270 and add more rules according to the matrix flows if needed
    /*
    rule270 = {
      name      = format("%s-%s-%s-%s", "nsg", var.env, local.nsg_name, "rule270_inbound")
      priority  = 270
      direction = "Inbound"
      access    = "Allow"

      # Tcp, Udp, Icmp, Esp, Ah or * 
      protocol               = "Tcp"
      source_port_range      = "*"
      destination_port_ranges = ["80", "443"]

      # at least 1 of the 2 parameters is required
      source_address_prefixes                 = []
      source_application_security_group_ids = [azurerm_application_security_group.asg1_vmrole1_eth0.id]

      # at least 1 of the 2 parameters is required
      destination_address_prefixes                 = []
      destination_application_security_group_ids = [azurerm_application_security_group.asg1_vmrole1_eth0.id]
    }

    # Add more rules here if needed  
*/
  }
}