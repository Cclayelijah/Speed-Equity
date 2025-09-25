export default {
  optimizeDeps: {
    include: ['react', 'react-dom', 'hoist-non-react-statics'],
    exclude: ['@emotion/styled']
  },
}