import SwiftUI
import UIKit

struct ReceiptView: View {
    @ObservedObject var viewModel: MenuViewModel
    @StateObject private var ttsManager = TTSManager.shared
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        ZStack {
            Color(white: 0.95).edgesIgnoringSafeArea(.all)
            
            VStack {
                Spacer()
                
                VStack(spacing: 16) {
                    Text(NSLocalizedString("RESTAURANT TICKET", comment: ""))
                        .font(.custom("Courier", size: 24))
                        .fontWeight(.bold)
                        .padding(.top, 32)
                    
                    Text("---------------------------------")
                        .font(.custom("Courier", size: 16))
                        .lineLimit(1)
                        .padding(.horizontal)
                    
                    VStack(alignment: .leading, spacing: 12) {
                        ForEach(viewModel.cart) { orderItem in
                            HStack(alignment: .top) {
                                Text("\(orderItem.quantity)x")
                                    .font(.custom("Courier", size: 14))
                                    .frame(width: 30, alignment: .leading)
                                
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(orderItem.menuItem.translatedName)
                                        .font(.custom("Courier", size: 14))
                                    Text(orderItem.menuItem.originalName)
                                        .font(.custom("Courier", size: 12))
                                        .foregroundColor(.gray)
                                }
                                
                                Spacer()
                                
                                Text(String(format: "%.2f", orderItem.menuItem.convertedPrice * Double(orderItem.quantity)))
                                    .font(.custom("Courier", size: 14))
                            }
                        }
                    }
                    .padding(.horizontal, 24)
                    
                    Text("---------------------------------")
                        .font(.custom("Courier", size: 16))
                        .lineLimit(1)
                        .padding(.horizontal)
                    
                    HStack {
                        Text(String(format: NSLocalizedString("TOTAL (%@)", comment: ""), viewModel.targetCurrency))
                            .font(.custom("Courier", size: 16))
                            .fontWeight(.bold)
                        Spacer()
                        Text(String(format: "%.2f", viewModel.currentOrder.totalConvertedPrice))
                            .font(.custom("Courier", size: 18))
                            .fontWeight(.bold)
                    }
                    .padding(.horizontal, 24)
                    
                    HStack {
                        Text(String(format: NSLocalizedString("PAY (%@)", comment: ""), viewModel.originalCurrency))
                            .font(.custom("Courier", size: 12))
                            .foregroundColor(.gray)
                        Spacer()
                        Text(String(format: "%.0f", viewModel.currentOrder.totalOriginalPrice))
                            .font(.custom("Courier", size: 12))
                            .foregroundColor(.gray)
                    }
                    .padding(.horizontal, 24)
                    
                    Image(systemName: "barcode")
                        .resizable()
                        .scaledToFit()
                        .frame(height: 40)
                        .padding(.top, 24)
                        .padding(.bottom, 32)
                }
                .background(Color.white)
                .clipShape(ReceiptShape())
                .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 10)
                .padding(.horizontal, 24)
                
                Spacer()
                
                Button {
                    UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
                    if ttsManager.isSpeaking {
                        ttsManager.stopSpeaking()
                    } else {
                        ttsManager.playOrder(items: viewModel.cart, originalCurrency: viewModel.originalCurrency)
                    }
                } label: {
                    HStack {
                        Image(systemName: ttsManager.isSpeaking ? "stop.circle.fill" : "play.circle.fill")
                        Text(ttsManager.isSpeaking ? NSLocalizedString("STOP", comment: "") : NSLocalizedString("PLAY ORDER", comment: ""))
                    }
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
                    .background(ttsManager.isSpeaking ? Color.red : Color.blue)
                    .cornerRadius(16)
                    .padding(.horizontal, 24)
                }
                .padding(.bottom, 32)
            }
            
            VStack {
                HStack {
                    Spacer()
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title)
                            .foregroundColor(.gray)
                    }
                    .padding()
                }
                Spacer()
            }
        }
        .onDisappear {
            ttsManager.stopSpeaking()
        }
    }
}

struct ReceiptShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let teeth: CGFloat = 15
        let toothWidth = rect.width / teeth
        let toothHeight: CGFloat = 8
        
        path.move(to: CGPoint(x: 0, y: 0))
        
        for i in 0..<Int(teeth) {
            let x = CGFloat(i) * toothWidth
            path.addLine(to: CGPoint(x: x + toothWidth/2, y: toothHeight))
            path.addLine(to: CGPoint(x: x + toothWidth, y: 0))
        }
        
        path.addLine(to: CGPoint(x: rect.width, y: rect.height))
        
        for i in (0..<Int(teeth)).reversed() {
            let x = CGFloat(i) * toothWidth
            path.addLine(to: CGPoint(x: x + toothWidth/2, y: rect.height - toothHeight))
            path.addLine(to: CGPoint(x: x, y: rect.height))
        }
        
        path.closeSubpath()
        return path
    }
}
