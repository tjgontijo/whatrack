'use client';

import React, { useState } from 'react';
import { Box, Tabs, Tab, Paper } from '@mui/material';
import { MessageSquare, Phone, Building2, Settings } from 'lucide-react';
import { MessagingTab } from './tabs/messaging-tab';
import { PhoneNumbersTab } from './tabs/phone-numbers-tab';
import { BusinessProfileTab } from './tabs/business-profile-tab';
import { ConfigurationTab } from './tabs/configuration-tab';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`whatsapp-tabpanel-${index}`}
            aria-labelledby={`whatsapp-tab-${index}`}
        >
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
}

export const WhatsAppSettingsTabs: React.FC = () => {
    const [currentTab, setCurrentTab] = useState(0);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
    };

    return (
        <Box sx={{ width: '100%' }}>
            <Paper
                elevation={0}
                sx={{
                    borderBottom: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                }}
            >
                <Tabs
                    value={currentTab}
                    onChange={handleTabChange}
                    aria-label="WhatsApp settings tabs"
                    sx={{
                        px: 2,
                        '& .MuiTab-root': {
                            minHeight: 64,
                            textTransform: 'none',
                            fontSize: '0.9375rem',
                            fontWeight: 500,
                            gap: 1,
                        },
                    }}
                >
                    <Tab
                        icon={<MessageSquare size={20} />}
                        iconPosition="start"
                        label="Mensagens"
                        id="whatsapp-tab-0"
                        aria-controls="whatsapp-tabpanel-0"
                    />
                    <Tab
                        icon={<Phone size={20} />}
                        iconPosition="start"
                        label="Números"
                        id="whatsapp-tab-1"
                        aria-controls="whatsapp-tabpanel-1"
                    />
                    <Tab
                        icon={<Building2 size={20} />}
                        iconPosition="start"
                        label="Perfil Comercial"
                        id="whatsapp-tab-2"
                        aria-controls="whatsapp-tabpanel-2"
                    />
                    <Tab
                        icon={<Settings size={20} />}
                        iconPosition="start"
                        label="Configuração"
                        id="whatsapp-tab-3"
                        aria-controls="whatsapp-tabpanel-3"
                    />
                </Tabs>
            </Paper>

            <TabPanel value={currentTab} index={0}>
                <MessagingTab />
            </TabPanel>
            <TabPanel value={currentTab} index={1}>
                <PhoneNumbersTab />
            </TabPanel>
            <TabPanel value={currentTab} index={2}>
                <BusinessProfileTab />
            </TabPanel>
            <TabPanel value={currentTab} index={3}>
                <ConfigurationTab />
            </TabPanel>
        </Box>
    );
};
