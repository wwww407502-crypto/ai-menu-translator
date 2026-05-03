import Foundation
import AVFoundation
import Combine

class TTSManager: NSObject, ObservableObject, AVSpeechSynthesizerDelegate, @unchecked Sendable {
    static let shared = TTSManager()
    private let synthesizer = AVSpeechSynthesizer()
    
    @Published var isSpeaking = false
    
    override init() {
        super.init()
        synthesizer.delegate = self
    }
    
    // Play the full order using the correct original language
    func playOrder(items: [OrderItem], originalCurrency: String) {
        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }
        
        let languageCode = getLanguageCode(for: originalCurrency)
        
        // Build the string to say. It varies slightly by language, but a simple list is fine.
        var textToSpeak = ""
        for item in items {
            textToSpeak += "\(item.quantity) x \(item.menuItem.originalName). "
        }
        
        let utterance = AVSpeechUtterance(string: textToSpeak)
        if let voice = AVSpeechSynthesisVoice(language: languageCode) {
            utterance.voice = voice
        }
        utterance.rate = 0.45 // slightly slower for clarity
        
        synthesizer.speak(utterance)
    }
    
    func stopSpeaking() {
        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }
    }
    
    // Delegate methods
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didStart utterance: AVSpeechUtterance) {
        DispatchQueue.main.async { self.isSpeaking = true }
    }
    
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        DispatchQueue.main.async { self.isSpeaking = false }
    }
    
    // Very basic mapping from Currency to Language Code
    private func getLanguageCode(for currency: String) -> String {
        switch currency.uppercased() {
        case "JPY": return "ja-JP"
        case "KRW": return "ko-KR"
        case "THB": return "ko-KR" // just fallback for demo
        case "EUR": return "fr-FR" // or de-DE
        case "USD": return "en-US"
        case "GBP": return "en-GB"
        case "CNY": return "zh-CN"
        default: return "en-US" // fallback
        }
    }
}
