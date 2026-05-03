import SwiftUI

struct ProcessingView: View {
    @State private var isAnimating = false
    
    var body: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)
            
            VStack(spacing: 32) {
                // Animated Shimmer Icon
                Image(systemName: "wand.and.stars")
                    .font(.system(size: 60))
                    .foregroundColor(.white)
                    .scaleEffect(isAnimating ? 1.1 : 0.9)
                    .opacity(isAnimating ? 1.0 : 0.5)
                    .animation(Animation.easeInOut(duration: 1.0).repeatForever(autoreverses: true), value: isAnimating)
                
                Text(NSLocalizedString("Analyzing Menu...", comment: ""))
                    .font(.system(size: 24, weight: .light))
                    .foregroundColor(.white)
                    .tracking(2)
                
                Text(NSLocalizedString("Translating and converting currencies", comment: ""))
                    .font(.subheadline)
                    .foregroundColor(.gray)
            }
            .onAppear {
                isAnimating = true
            }
        }
    }
}
