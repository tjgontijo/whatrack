'use client';

import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface SuspenseLoaderProps {
    message?: string;
}

export const SuspenseLoader: React.FC<SuspenseLoaderProps> = ({ message = 'Carregando...' }) => {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '200px',
                gap: 2,
            }}
        >
            <CircularProgress size={40} thickness={4} />
            <Typography variant="body2" color="text.secondary">
                {message}
            </Typography>
        </Box>
    );
};

export default SuspenseLoader;
