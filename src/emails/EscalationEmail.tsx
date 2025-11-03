import * as React from 'react';
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Section,
  Img,
  Hr,
} from '@react-email/components';
import { plentichatAssets } from '@/config/plentichat-assets.config';

interface EscalationEmailProps {
  userName?: string;
  context: string;
  link: string;
}

export default function EscalationEmail({
  userName = 'A customer',
  context,
  link,
}: EscalationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`${userName} needs your attention`}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo */}
          <Section style={logoSection}>
            <Img
              src={plentichatAssets.logo.long}
              alt="PlentiChat"
              style={logo}
            />
          </Section>

          {/* Main Content */}
          <Heading style={heading}>🚨 Escalation Alert</Heading>

          <Text style={text}>
            <strong>{userName}</strong> needs your attention:
          </Text>

          <Section style={quoteBox}>
            <Text style={quoteText}>{context}</Text>
          </Section>

          <Text style={text}>You can reply directly in PlentiChat:</Text>

          <Section style={buttonSection}>
            <Button href={link} style={button}>
              View Conversation
            </Button>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Text style={footer}>— The PlentiChat AI Team</Text>

          <Text style={footerLinks}>
            <a href={plentichatAssets.website.landing} style={linkStyle}>
              Visit Website
            </a>
            {plentichatAssets.social.linkedin && (
              <>
                {' • '}
                <a href={plentichatAssets.social.linkedin} style={linkStyle}>
                  LinkedIn
                </a>
              </>
            )}
            {plentichatAssets.social.twitter && (
              <>
                {' • '}
                <a href={plentichatAssets.social.twitter} style={linkStyle}>
                  Twitter
                </a>
              </>
            )}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
  padding: '20px 0',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '600px',
  borderRadius: '8px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
};

const logoSection = {
  textAlign: 'center' as const,
  marginBottom: '32px',
};

const logo = {
  height: '40px',
  width: 'auto',
};

const heading = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.3',
  margin: '0 0 24px',
  textAlign: 'center' as const,
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const quoteBox = {
  backgroundColor: '#f9fafb',
  border: `2px solid ${plentichatAssets.colors.primary}`,
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const quoteText = {
  color: '#1f2937',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0',
  fontStyle: 'italic',
};

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: plentichatAssets.colors.primary,
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
  cursor: 'pointer',
};

const divider = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
};

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '16px 0 8px',
  textAlign: 'center' as const,
};

const footerLinks = {
  color: '#9ca3af',
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: '8px 0 0',
};

const linkStyle = {
  color: plentichatAssets.colors.primary,
  textDecoration: 'none',
};
