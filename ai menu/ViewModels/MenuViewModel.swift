import Foundation
import UIKit
import Combine

@MainActor
class MenuViewModel: ObservableObject {
    @Published var menuItems: [MenuItem] = []
    @Published var cart: [OrderItem] = []
    
    @Published var isProcessing: Bool = false
    @Published var errorMessage: String? = nil
    
    @Published var originalCurrency: String = "USD"
    @Published var targetCurrency: String = "CNY"
    @Published var exchangeRate: Double = 1.0
    
    @Published var selectedImage: UIImage?
    
    var currentOrder: Order {
        Order(items: cart)
    }
    
    func processImage(_ image: UIImage) async {
        isProcessing = true
        errorMessage = nil

        let lang = Self.normalizedLanguageTag(Bundle.main.preferredLocalizations.first)
        let currency = Locale.current.currency?.identifier ?? "CNY"
        
        do {
            let response = try await APIService.shared.parseMenu(image: image, targetLang: lang, targetCurrency: currency)
            self.menuItems = response.items
            self.originalCurrency = response.originalCurrency
            self.targetCurrency = response.targetCurrency
            self.exchangeRate = response.exchangeRate
            self.cart.removeAll()
            
            self.isProcessing = false
        } catch {
            self.errorMessage = "Failed to process image: \(error.localizedDescription)"
            self.isProcessing = false
            
            // DEMO DATA if server fails (useful for UI development)
            self.menuItems = [
                MenuItem(category: "主食", originalName: "特製豚骨ラーメン", translatedName: "Signature Pork Bone Ramen", originalPrice: 980, convertedPrice: 48.0),
                MenuItem(category: "小吃", originalName: "餃子 (5個)", translatedName: "Gyoza (5 pcs)", originalPrice: 400, convertedPrice: 19.6),
                MenuItem(category: "饮品", originalName: "生ビール", translatedName: "Draft Beer", originalPrice: 500, convertedPrice: 24.5)
            ]
            self.originalCurrency = "JPY"
            self.targetCurrency = "CNY"
            self.exchangeRate = 0.049
        }
    }

    static func normalizedLanguageTag(_ tag: String?) -> String {
        guard let tag, !tag.isEmpty else { return "en" }
        switch tag {
        case "zh-Hans": return "zh-CN"
        case "zh-Hant": return "zh-TW"
        default: return tag
        }
    }
    
    func addToCart(item: MenuItem) {
        if let index = cart.firstIndex(where: { $0.menuItem.id == item.id }) {
            cart[index].quantity += 1
        } else {
            cart.append(OrderItem(menuItem: item, quantity: 1))
        }
    }
    
    func removeFromCart(item: MenuItem) {
        if let index = cart.firstIndex(where: { $0.menuItem.id == item.id }) {
            if cart[index].quantity > 1 {
                cart[index].quantity -= 1
            } else {
                cart.remove(at: index)
            }
        }
    }
    
    func quantity(for item: MenuItem) -> Int {
        return cart.first(where: { $0.menuItem.id == item.id })?.quantity ?? 0
    }
    
    func clearCart() {
        cart.removeAll()
    }

    func resetToHome() {
        menuItems.removeAll()
        cart.removeAll()
        selectedImage = nil
        errorMessage = nil
        isProcessing = false
    }
}
