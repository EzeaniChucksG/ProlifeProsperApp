import React, { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import WebView from 'react-native-webview';

interface GettrxPaymentFormProps {
  publishableKey: string;
  accountId: string;
  amount: number;
  onToken: (token: string) => void;
  onError: (error: string) => void;
  donationType?: 'one-time' | 'recurring';
}

export interface GettrxPaymentFormRef {
  createToken: () => void;
}

export const GettrxPaymentForm = forwardRef<GettrxPaymentFormRef, GettrxPaymentFormProps>(
  ({ publishableKey, accountId, amount, onToken, onError, donationType = 'one-time' }, ref) => {
    const webViewRef = useRef<WebView>(null);
    const [isReady, setIsReady] = useState(false);

    // Expose createToken method to parent via ref
    useImperativeHandle(ref, () => ({
      createToken: () => {
        if (webViewRef.current && isReady) {
          webViewRef.current.injectJavaScript('window.createPaymentToken(); true;');
        } else {
          onError('Payment form not ready');
        }
      }
    }));

    const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <script src="https://cdn.gettrx.com/gettrx-one.js"></script>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            padding: 16px;
            background: #f5f5f5;
          }
          
          #payment-form {
            background: white;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          
          .form-label {
            font-size: 14px;
            font-weight: 600;
            color: #333;
            margin-bottom: 8px;
            display: block;
          }
          
          .loading {
            text-align: center;
            padding: 32px;
            color: #666;
          }
          
          .error {
            background: #fee;
            color: #c33;
            padding: 12px;
            border-radius: 4px;
            margin-bottom: 16px;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div id="payment-container">
          <div class="loading">Loading payment form...</div>
        </div>
        
        <script>
          // Set a timeout for SDK loading
          let sdkLoadTimeout = setTimeout(() => {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: 'GETTRX SDK failed to load. Please check your internet connection.'
            }));
          }, 10000); // 10 second timeout
          
          (async function() {
            try {
              // Check if GETTRX SDK loaded
              if (typeof GettrxOne === 'undefined') {
                throw new Error('GETTRX SDK not loaded');
              }
              
              clearTimeout(sdkLoadTimeout);
              
              // Initialize GETTRX One
              const gettrx = new GettrxOne('${publishableKey}', {
                onBehalfOf: '${accountId}'
              });
              
              console.log('GETTRX SDK initialized');
              
              // Create Web Elements
              const webElements = gettrx.webElements({
                mode: '${donationType === 'recurring' ? 'subscription' : 'payment'}',
                currency: 'usd',
                amount: '${amount.toFixed(2)}',
                setupFutureUsage: ${donationType === 'recurring' ? "'off_session'" : 'undefined'}
              });
              
              console.log('Web elements created');
              
              // Create and mount payment element
              const paymentElement = webElements.create('payment');
              
              const container = document.getElementById('payment-container');
              container.innerHTML = '<div id="payment-form"></div>';
              
              paymentElement.mount('#payment-form');
              
              console.log('Payment form mounted');
              
              // Notify React Native that form is ready
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'FORM_READY'
              }));
              
              // Expose method to create token (called from React Native)
              window.createPaymentToken = async function() {
                try {
                  console.log('Creating payment token...');
                  
                  const result = await gettrx.createToken();
                  
                  if (result.error) {
                    console.error('Token creation error:', result.error);
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'TOKEN_ERROR',
                      error: result.error.message || 'Failed to create payment token'
                    }));
                  } else if (result.token) {
                    console.log('Token created successfully');
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'TOKEN_CREATED',
                      token: result.token
                    }));
                  } else {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'TOKEN_ERROR',
                      error: 'No token returned'
                    }));
                  }
                } catch (error) {
                  console.error('Token creation exception:', error);
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'TOKEN_ERROR',
                    error: error.message || 'Unknown error occurred'
                  }));
                }
              };
              
            } catch (error) {
              console.error('GETTRX initialization error:', error);
              
              const container = document.getElementById('payment-container');
              container.innerHTML = \`
                <div class="error">
                  Failed to initialize payment system. Please try again.
                </div>
              \`;
              
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'INIT_ERROR',
                error: error.message || 'Failed to initialize payment system'
              }));
            }
          })();
        </script>
      </body>
    </html>
  `;

    const handleMessage = (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        console.log('WebView message:', data.type);

        switch (data.type) {
          case 'FORM_READY':
            setIsReady(true);
            break;

          case 'TOKEN_CREATED':
            if (data.token) {
              onToken(data.token);
            } else {
              onError('No payment token received');
            }
            break;

          case 'TOKEN_ERROR':
          case 'INIT_ERROR':
          case 'error':
            onError(data.error || data.message || 'Payment system error');
            break;

          default:
            console.log('Unknown message type:', data.type);
        }
      } catch (error: any) {
        console.error('Error parsing WebView message:', error);
        onError('Communication error with payment system');
      }
    };

    return (
      <View style={styles.container}>
        {!isReady && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#0d72b9" />
            <Text style={styles.loadingText}>Loading secure payment form...</Text>
          </View>
        )}

        <WebView
          ref={webViewRef}
          source={{ html: htmlContent }}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          style={[styles.webview, !isReady && styles.hidden]}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error:', nativeEvent);
            onError('Failed to load payment form');
          }}
        />
      </View>
    );
  }
);

GettrxPaymentForm.displayName = 'GettrxPaymentForm';

const styles = StyleSheet.create({
  container: {
    height: 400,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  hidden: {
    opacity: 0,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
});
