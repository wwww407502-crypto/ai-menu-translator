import SwiftUI
import UIKit

struct MenuListView: View {
    @ObservedObject var viewModel: MenuViewModel
    @State private var showReceipt = false
    @State private var selectedCategory: String? = nil
    @State private var isSearching = false
    @State private var searchText = ""
    @Environment(\.dismiss) private var dismiss
    
    var filteredMenuItems: [MenuItem] {
        let q = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !q.isEmpty else { return viewModel.menuItems }
        return viewModel.menuItems.filter {
            $0.translatedName.localizedCaseInsensitiveContains(q) ||
            $0.originalName.localizedCaseInsensitiveContains(q) ||
            ($0.category ?? "").localizedCaseInsensitiveContains(q)
        }
    }
    
    var groupedItems: [(String, [MenuItem])] {
        let other = NSLocalizedString("Other", comment: "")
        let dict = Dictionary(grouping: filteredMenuItems, by: { $0.category ?? other })
        return dict.sorted { $0.key.localizedCaseInsensitiveCompare($1.key) == .orderedAscending }
    }
    
    var categories: [String] {
        groupedItems.map { $0.0 }
    }
    
    var body: some View {
        ZStack(alignment: .bottom) {
            Color(UIColor.systemGroupedBackground).ignoresSafeArea()
            
            VStack(spacing: 0) {
                HStack {
                    Button(action: {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        viewModel.resetToHome()
                    }) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.primary)
                            .frame(width: 36, height: 36)
                            .background(Color(UIColor.secondarySystemBackground))
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                    
                    Spacer()
                    
                    Button {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
                            isSearching.toggle()
                        }
                    } label: {
                        Image(systemName: isSearching ? "xmark" : "magnifyingglass")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.primary)
                            .frame(width: 36, height: 36)
                            .background(Color(UIColor.secondarySystemBackground))
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Color(UIColor.systemGroupedBackground))
                
                if isSearching {
                    HStack(spacing: 10) {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.secondary)
                        
                        TextField(NSLocalizedString("Search", comment: ""), text: $searchText)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled(true)
                        
                        if !searchText.isEmpty {
                            Button {
                                searchText = ""
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.secondary)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(Color(UIColor.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .padding(.horizontal, 16)
                    .padding(.bottom, 8)
                    .transition(.move(edge: .top).combined(with: .opacity))
                }
                
                HStack(spacing: 0) {
                    CategoryRail(
                        categories: categories,
                        selectedCategory: $selectedCategory
                    )
                    .frame(width: 92)
                    
                    Divider()
                    
                    MenuContent(
                        groupedItems: groupedItems,
                        viewModel: viewModel,
                        selectedCategory: $selectedCategory
                    )
                }
            }
            
            if !viewModel.cart.isEmpty {
                VStack(spacing: 0) {
                    Divider()
                    HStack {
                        VStack(alignment: .leading) {
                            Text(NSLocalizedString("Total", comment: ""))
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text("\(viewModel.targetCurrency) \(viewModel.currentOrder.totalConvertedPrice, specifier: "%.2f")")
                                .font(.system(size: 20, weight: .bold))
                            Text("(\(viewModel.originalCurrency) \(viewModel.currentOrder.totalOriginalPrice, specifier: "%.0f"))")
                                .font(.caption2)
                                .foregroundColor(.gray)
                        }
                        
                        Spacer()
                        
                        Button {
                            showReceipt = true
                        } label: {
                            Text(NSLocalizedString("ORDER", comment: ""))
                                .font(.headline)
                                .foregroundColor(.white)
                                .padding(.horizontal, 32)
                                .padding(.vertical, 16)
                                .background(Color.black)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }
                    .padding()
                    .background(Color(UIColor.systemBackground).opacity(0.92))
                }
                .transition(.move(edge: .bottom).combined(with: .opacity))
                .animation(.spring(response: 0.4, dampingFraction: 0.7), value: viewModel.cart.count)
            }
        }
        .sheet(isPresented: $showReceipt) {
            ReceiptView(viewModel: viewModel)
        }
        .onAppear {
            if selectedCategory == nil {
                selectedCategory = categories.first
            }
        }
        .onChange(of: searchText) { _, _ in
            if let selectedCategory, categories.contains(selectedCategory) {
                return
            }
            selectedCategory = categories.first
        }
        .onChange(of: isSearching) { _, newValue in
            if !newValue {
                searchText = ""
            }
        }
    }
}

struct CategoryRail: View {
    let categories: [String]
    @Binding var selectedCategory: String?
    
    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 8) {
                ForEach(categories, id: \.self) { category in
                    Button {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        selectedCategory = category
                    } label: {
                        HStack(spacing: 10) {
                            Capsule()
                                .fill(selectedCategory == category ? Color.black : Color.clear)
                                .frame(width: 3, height: 18)
                            
                            Text(category)
                                .font(.system(size: 12, weight: selectedCategory == category ? .semibold : .regular))
                                .foregroundColor(.primary)
                                .lineLimit(2)
                                .multilineTextAlignment(.leading)
                            
                            Spacer(minLength: 0)
                        }
                        .padding(.vertical, 10)
                        .padding(.horizontal, 10)
                        .background(selectedCategory == category ? Color(UIColor.systemBackground) : Color.clear)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 12)
        }
        .background(Color(UIColor.secondarySystemGroupedBackground))
    }
}

struct MenuContent: View {
    let groupedItems: [(String, [MenuItem])]
    @ObservedObject var viewModel: MenuViewModel
    @Binding var selectedCategory: String?
    
    var body: some View {
        ScrollViewReader { proxy in
            ScrollView(.vertical, showsIndicators: true) {
                VStack(alignment: .leading, spacing: 18) {
                    ForEach(groupedItems, id: \.0) { category, items in
                        VStack(alignment: .leading, spacing: 10) {
                            Text(category)
                                .font(.system(size: 16, weight: .bold))
                                .padding(.top, 6)
                                .id(category)
                            
                            VStack(spacing: 0) {
                                ForEach(items) { item in
                                    MenuRow(item: item, viewModel: viewModel)
                                    if item != items.last {
                                        Divider().padding(.leading, 60)
                                    }
                                }
                            }
                            .background(Color(UIColor.systemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        }
                    }
                }
                .padding(.horizontal, 14)
                .padding(.top, 14)
                .padding(.bottom, 130)
            }
            .onChange(of: selectedCategory) { _, newValue in
                guard let newValue else { return }
                withAnimation(.spring(response: 0.45, dampingFraction: 0.85)) {
                    proxy.scrollTo(newValue, anchor: .top)
                }
            }
        }
        .background(Color(UIColor.systemGroupedBackground))
    }
}

struct MenuRow: View {
    let item: MenuItem
    @ObservedObject var viewModel: MenuViewModel
    
    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [
                                Color(UIColor.secondarySystemBackground),
                                Color(UIColor.tertiarySystemBackground)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                
                Image(systemName: "fork.knife")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(Color(UIColor.tertiaryLabel))
            }
            .frame(width: 48, height: 48)
            
            VStack(alignment: .leading, spacing: 3) {
                Text(item.translatedName)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.primary)
                    .lineLimit(1)
                
                Text(item.originalName)
                    .font(.system(size: 12, weight: .regular))
                    .foregroundColor(.secondary)
                    .lineLimit(1)
                
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text("\(viewModel.targetCurrency) \(item.convertedPrice, specifier: "%.2f")")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.primary)
                    
                    Text("\(viewModel.originalCurrency) \(item.originalPrice, specifier: "%.0f")")
                        .font(.system(size: 11, weight: .regular))
                        .foregroundColor(Color(UIColor.tertiaryLabel))
                }
            }
            
            Spacer(minLength: 0)
            
            HStack(spacing: 10) {
                if viewModel.quantity(for: item) > 0 {
                    Button {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        withAnimation { viewModel.removeFromCart(item: item) }
                    } label: {
                        Image(systemName: "minus")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.primary)
                            .frame(width: 28, height: 28)
                            .background(Color(UIColor.secondarySystemBackground))
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                    
                    Text("\(viewModel.quantity(for: item))")
                        .font(.system(.body, design: .monospaced).weight(.semibold))
                        .frame(minWidth: 18)
                }
                
                Button {
                    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                    withAnimation { viewModel.addToCart(item: item) }
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                        .frame(width: 30, height: 30)
                        .background(Color.black)
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 12)
    }
}
